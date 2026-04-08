import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import type { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import type { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import type { IHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshotPermission";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackRoleSnapshotPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRoleSnapshotPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering role snapshot permissions by permission name using the search parameter.
 *
 * Validates the search functionality of role snapshot permissions, ensuring that the search parameter correctly filters permissions by partial name matching. The test verifies that permissions containing the search term are returned while others are excluded, and that pagination metadata accurately reflects the filtered results.
 *
 * Special attention is given to verifying case-insensitive partial matching behavior and ensuring that the pagination metadata (current page, limit, total records, total pages) correctly represents the filtered dataset.
 *
 * 1. Authenticate as a member using authorize_member_join utility
 * 2. Call the role snapshot permissions endpoint with search parameter set to 'management'
 * 3. Verify the response contains only permissions matching the search term
 * 4. Validate pagination metadata reflects the filtered result count
 * 5. Test with a different search term to verify filtering accuracy
 * 6. Test with a search term that matches no permissions to verify empty results handling
 */
export async function test_api_role_snapshot_permissions_search_by_permission_name(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection);
  // 2. Generate a valid snapshot ID for testing
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test search with 'management' term
  const managementSearch =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.index(
      memberConnection,
      {
        snapshotId,
        body: {
          search: "management",
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshotPermission.IRequest,
      },
    );
  typia.assert(managementSearch);
  // Verify all returned permissions contain 'management' in their name
  TestValidator.predicate(
    "all permissions contain 'management'",
    managementSearch.data.every((perm) =>
      perm.permission.toLowerCase().includes("management"),
    ),
  );
  // Verify pagination metadata
  TestValidator.equals(
    "pagination limit matches request",
    managementSearch.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    managementSearch.pagination.current >= 1,
  );
  // 4. Test search with 'viewing' term
  const viewingSearch =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.index(
      memberConnection,
      {
        snapshotId,
        body: {
          search: "viewing",
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshotPermission.IRequest,
      },
    );
  typia.assert(viewingSearch);
  // Verify all returned permissions contain 'viewing' in their name
  TestValidator.predicate(
    "all permissions contain 'viewing'",
    viewingSearch.data.every((perm) =>
      perm.permission.toLowerCase().includes("viewing"),
    ),
  );
  // 5. Test search with non-matching term
  const emptySearch =
    await api.functional.hrmTimeTrack.member.role_snapshots.permissions.index(
      memberConnection,
      {
        snapshotId,
        body: {
          search: "nonexistent_permission_xyz",
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshotPermission.IRequest,
      },
    );
  typia.assert(emptySearch);
  // Verify empty results
  TestValidator.equals(
    "no permissions match nonexistent term",
    emptySearch.data.length,
    0,
  );
  TestValidator.equals(
    "total records is zero",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("total pages is zero", emptySearch.pagination.pages, 0);
  // 6. Verify business logic for non-empty results
  if (managementSearch.data.length > 0) {
    const firstPermission = managementSearch.data[0];
    // Verify permission name matches search criteria
    TestValidator.predicate(
      "first permission matches search",
      firstPermission.permission.toLowerCase().includes("management"),
    );
    // Verify roleSnapshot relation exists
    TestValidator.predicate(
      "roleSnapshot name is not empty",
      firstPermission.roleSnapshot.name.length > 0,
    );
  }
}
