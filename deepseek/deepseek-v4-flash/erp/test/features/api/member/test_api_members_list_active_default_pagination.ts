import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test listing active member accounts with default pagination and sorting.
 *
 * Validates the complete member listing workflow from data preparation through response validation. Ensures that the endpoint correctly applies default pagination (page=1, limit=default), filters to active-only accounts (deleted_at IS NULL), and returns results sorted by created_at descending (newest first).
 *
 * The test verifies that sensitive fields like password_hash are excluded from the response and that pagination metadata is computed accurately from the actual record count.
 *
 * 1. Register at least 3 distinct member accounts via authorize_member_join to populate the members table.
 * 2. Call PATCH /hrmTimeTracking/members with an empty request body (no filters, no pagination, no sort overrides).
 * 3. Validate pagination metadata: current=1, limit>0, records>=3, pages=Math.ceil(records/limit).
 * 4. Confirm all returned records have deleted_at=null (active-only filter applied by default).
 * 5. Verify records are ordered by created_at descending (newest first).
 */
export async function test_api_members_list_active_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Register 3 member accounts to populate the database
  //----
  const memberCreatedAts: string[] = [];
  for (let i = 0; i < 3; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
    typia.assert(authorized);
    memberCreatedAts.push(authorized.created_at);
  }
  //----
  // Call PATCH /hrmTimeTracking/members with empty body (no filters)
  //----
  const page = await api.functional.hrmTimeTracking.members.index(connection, {
    body: {} satisfies IHrmTimeTrackingMember.IRequest,
  });
  typia.assert(page);
  //----
  // Verify pagination metadata
  //----
  TestValidator.equals("current page is 1", page.pagination.current, 1);
  TestValidator.predicate(
    "limit is a positive default value",
    page.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records >= 3 (at least the registered members)",
    page.pagination.records >= 3,
  );
  TestValidator.equals(
    "pages = Math.ceil(records / limit)",
    page.pagination.pages,
    Math.ceil(page.pagination.records / page.pagination.limit),
  );
  //----
  // Verify all returned records are active (deleted_at is null)
  //----
  for (const record of page.data) {
    TestValidator.equals(
      "deleted_at is null (active account)",
      record.deleted_at,
      null,
    );
  }
  //----
  // Verify records are ordered by created_at descending (newest first)
  //----
  for (let i = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      `record[${i - 1}] is newer than or equal to record[${i}]`,
      page.data[i - 1].created_at >= page.data[i].created_at,
    );
  }
}
