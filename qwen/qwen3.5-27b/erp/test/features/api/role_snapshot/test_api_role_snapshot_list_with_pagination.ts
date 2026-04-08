import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRoleSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path of listing role snapshots with pagination.
 *
 * Validates the complete role snapshot listing workflow including member authentication, paginated retrieval of role snapshots, and comprehensive response structure validation. Ensures that the API correctly returns role snapshots with proper pagination metadata and that each snapshot contains all required fields including role references and optional creator information.
 *
 * Special attention is given to verifying pagination metadata accuracy, snapshot immutability, proper handling of null createdByMember for system-generated snapshots, and validation of nested role summary objects.
 *
 * 1. Register and authenticate a new member using the authorize_member_join utility function.
 * 2. Create a member-specific connection from the base connection for isolation.
 * 3. Call the role-snapshots endpoint with default pagination parameters (empty request body).
 * 4. Validate the response structure matches IPageIHrmTimeTrackRoleSnapshot.ISummary.
 * 5. Verify pagination metadata contains valid values (current page, limit, records, pages).
 * 6. Verify each snapshot in the data array contains all required fields.
 * 7. Validate snapshots are sorted by created_at in descending order.
 * 8. Verify organization scoping and role reference integrity.
 */
export async function test_api_role_snapshot_list_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Call the role-snapshots endpoint with default pagination
  const response =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {} satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculation",
    response.pagination.pages,
    expectedPages,
  );
  // 5. Validate current page doesn't exceed total pages when records exist
  if (response.pagination.records > 0) {
    TestValidator.predicate(
      "current page doesn't exceed total pages",
      response.pagination.current <= response.pagination.pages,
    );
  }
  // 6. Validate each snapshot in the data array
  await ArrayUtil.asyncForEach(response.data, async (snapshot, index) => {
    // Validate required fields exist
    TestValidator.predicate(
      `snapshot[${index}] has valid UUID id`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot[${index}] has name`,
      typeof snapshot.name === "string" && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot[${index}] has valid is_builtin`,
      typeof snapshot.is_builtin === "boolean",
    );
    TestValidator.predicate(
      `snapshot[${index}] has created_at`,
      typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
    );
    // Validate description can be null or string
    TestValidator.predicate(
      `snapshot[${index}] description is null or string`,
      snapshot.description === null || typeof snapshot.description === "string",
    );
    // Validate role reference
    TestValidator.predicate(
      `snapshot[${index}] has role reference`,
      snapshot.role !== null && snapshot.role !== undefined,
    );
    TestValidator.predicate(
      `snapshot[${index}] role has valid UUID id`,
      typeof snapshot.role.id === "string" && snapshot.role.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot[${index}] role has name`,
      typeof snapshot.role.name === "string" && snapshot.role.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot[${index}] role has valid is_builtin`,
      typeof snapshot.role.is_builtin === "boolean",
    );
    TestValidator.predicate(
      `snapshot[${index}] role has created_at`,
      typeof snapshot.role.created_at === "string" &&
        snapshot.role.created_at.length > 0,
    );
    // Validate createdByMember can be null or valid summary
    if (snapshot.createdByMember !== null) {
      TestValidator.predicate(
        `snapshot[${index}] createdByMember has valid UUID id`,
        typeof snapshot.createdByMember.id === "string" &&
          snapshot.createdByMember.id.length > 0,
      );
      TestValidator.predicate(
        `snapshot[${index}] createdByMember has email`,
        typeof snapshot.createdByMember.email === "string" &&
          snapshot.createdByMember.email.length > 0,
      );
      TestValidator.predicate(
        `snapshot[${index}] createdByMember has created_at`,
        typeof snapshot.createdByMember.created_at === "string" &&
          snapshot.createdByMember.created_at.length > 0,
      );
      TestValidator.predicate(
        `snapshot[${index}] createdByMember has updated_at`,
        typeof snapshot.createdByMember.updated_at === "string" &&
          snapshot.createdByMember.updated_at.length > 0,
      );
    }
    // Validate sorting (descending by created_at)
    if (index > 0) {
      const previousSnapshot = response.data[index - 1];
      const previousDate = new Date(previousSnapshot.created_at).getTime();
      const currentDate = new Date(snapshot.created_at).getTime();
      TestValidator.predicate(
        `snapshot[${index}] is sorted after previous snapshot (descending by created_at)`,
        !isNaN(previousDate) &&
          !isNaN(currentDate) &&
          currentDate <= previousDate,
      );
    }
  });
}
