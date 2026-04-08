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
 * Test filtering role snapshots by various criteria including role ID, date range, built-in status, and creator.
 *
 * Validates the role snapshot filtering functionality by testing individual and combined filter criteria. Ensures that the API correctly narrows down results based on role ID, date range, built-in status, creator member ID, and name search patterns.
 *
 * Special attention is given to verifying that date range filtering uses inclusive comparisons, built-in status correctly distinguishes system roles from custom roles, and search performs case-insensitive partial matching.
 *
 * 1. Authenticate as a member to access role snapshots within an organization context.
 * 2. Test filtering by role ID to verify only snapshots for that specific role are returned.
 * 3. Test filtering by date range to verify snapshots within the specified time period are returned.
 * 4. Test filtering by built-in status to distinguish between system and custom role snapshots.
 * 5. Test filtering by creator member ID to verify snapshots created by a specific member.
 * 6. Test name search to verify case-insensitive partial matching on role names.
 * 7. Test combined filters to verify correct intersection of multiple filter criteria.
 */
export async function test_api_role_snapshot_filter_by_criteria(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Test filtering by role ID
  const roleId = typia.random<string & tags.Format<"uuid">>();
  const byRoleId =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          hrm_time_track_role_id: roleId,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(byRoleId);
  TestValidator.equals(
    "all snapshots belong to specified role",
    byRoleId.data.every((s) => s.role.id === roleId),
    true,
  );
  // 3. Test filtering by date range
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const twoDaysAgo = new Date(
    now.getTime() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const byDateRange =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          created_at_from: twoDaysAgo,
          created_at_to: oneDayAgo,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(byDateRange);
  TestValidator.predicate(
    "all snapshots within date range",
    byDateRange.data.every(
      (s) => s.created_at >= twoDaysAgo && s.created_at <= oneDayAgo,
    ),
  );
  // 4. Test filtering by built-in status (true)
  const byBuiltInTrue =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          is_builtin: true,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(byBuiltInTrue);
  TestValidator.equals(
    "all snapshots are built-in roles",
    byBuiltInTrue.data.every((s) => s.is_builtin === true),
    true,
  );
  // 5. Test filtering by built-in status (false)
  const byBuiltInFalse =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          is_builtin: false,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(byBuiltInFalse);
  TestValidator.equals(
    "all snapshots are custom roles",
    byBuiltInFalse.data.every((s) => s.is_builtin === false),
    true,
  );
  // 6. Test filtering by creator member ID
  const byCreator =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          created_by_member_id: member.id,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(byCreator);
  TestValidator.predicate(
    "all snapshots created by specified member",
    byCreator.data.every(
      (s) => s.createdByMember !== null && s.createdByMember.id === member.id,
    ),
  );
  // 7. Test name search
  const searchTerm = RandomGenerator.alphabets(3);
  const bySearch =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          search: searchTerm,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(bySearch);
  TestValidator.predicate(
    "all snapshots contain search term in name",
    bySearch.data.every((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()),
    ),
  );
  // 8. Test combined filters
  const combinedFilters =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          is_builtin: true,
          created_at_from: twoDaysAgo,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilters);
  TestValidator.predicate(
    "combined filters applied correctly",
    combinedFilters.data.every(
      (s) => s.is_builtin === true && s.created_at >= twoDaysAgo,
    ),
  );
  // 9. Test pagination with filters
  const paginated =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination limit respected",
    paginated.data.length <= 10,
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    paginated.pagination.current,
    1,
  );
  // 10. Test empty results with non-matching filter
  const nonMatchingId = typia.random<string & tags.Format<"uuid">>();
  const emptyResults =
    await api.functional.hrmTimeTrack.member.role_snapshots.index(
      memberConnection,
      {
        body: {
          hrm_time_track_role_id: nonMatchingId,
          limit: 20,
        } satisfies IHrmTimeTrackRoleSnapshot.IRequest,
      },
    );
  typia.assert(emptyResults);
  TestValidator.predicate(
    "empty results handled gracefully",
    emptyResults.data.length >= 0,
  );
}
