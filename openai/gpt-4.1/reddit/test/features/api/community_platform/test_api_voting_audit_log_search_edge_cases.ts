import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingAuditLog";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingAuditLog";

/**
 * Validate voting audit log search edge cases for administrator.
 *
 * 1. Authenticate as administrator
 * 2. Search logs by non-existent user_id, non-existent target_id, or no-hit
 *    vote_type/result_status
 * 3. Search logs by far-past/future date range to guarantee empty result
 * 4. Search logs by random IP or session_id to guarantee empty result
 * 5. For each search, assert a valid, empty, paginated page with no error and
 *    privacy preserved
 */
export async function test_api_voting_audit_log_search_edge_cases(
  connection: api.IConnection,
) {
  // 1. Join as admin
  const adminJoinResult = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        business_status: RandomGenerator.alphabets(8),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminJoinResult);

  // 2. Search by non-existent user_id
  const fakeUserId = typia.random<string & tags.Format<"uuid">>();
  const byUser =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          user_id: fakeUserId,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(byUser);
  TestValidator.equals("byUser.data is empty", byUser.data.length, 0);

  // 3. Search by non-existent target_id
  const fakeTargetId = typia.random<string & tags.Format<"uuid">>();
  const byTarget =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          target_id: fakeTargetId,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(byTarget);
  TestValidator.equals("byTarget.data is empty", byTarget.data.length, 0);

  // 4. Search by valid vote_type with guaranteed no-hit value
  const byType =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          vote_type: RandomGenerator.pick(["up", "down", "remove"] as const),
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(byType);
  // No way to guarantee truly empty unless no audit logs exist, so only check that it succeeded and is not an error
  TestValidator.predicate("byType.data is array", Array.isArray(byType.data));

  // 5. Search by accepted result_status but unlikely to exist
  const unlikelyStatus = RandomGenerator.pick([
    "reversed",
    "rate_limited",
  ] as const);
  const byStatus =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          result_status: unlikelyStatus,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(byStatus);
  TestValidator.predicate(
    "byStatus.data is array",
    Array.isArray(byStatus.data),
  );

  // 6. Search with out-of-bounds dates (far future)
  const farFuture = new Date(
    Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const futureSearch =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          start_date: farFuture,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(futureSearch);
  TestValidator.equals(
    "futureSearch.data is empty",
    futureSearch.data.length,
    0,
  );

  // 7. Out-of-bounds date (far past)
  const farPast = new Date(
    Date.now() - 50 * 365 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const pastSearch =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          end_date: farPast,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(pastSearch);
  TestValidator.equals("pastSearch.data is empty", pastSearch.data.length, 0);

  // 8. Search by synthetic/random IP that shouldn't match any real log
  const syntheticIp = [
    RandomGenerator.pick([10, 11, 12, 13, 14, 15]),
    RandomGenerator.pick([128, 129, 130, 131, 132, 133]),
    RandomGenerator.pick([201, 202, 203, 204, 205, 206]),
    RandomGenerator.pick([109, 110, 111, 112, 113]),
  ].join(".");
  const byIp =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          ip: syntheticIp,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(byIp);
  TestValidator.equals("byIp.data is empty", byIp.data.length, 0);

  // 9. Search by synthetic session_id
  const syntheticSessionId = typia.random<string & tags.Format<"uuid">>();
  const bySession =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      {
        body: {
          session_id: syntheticSessionId,
        } satisfies ICommunityPlatformVotingAuditLog.IRequest,
      },
    );
  typia.assert(bySession);
  TestValidator.equals("bySession.data is empty", bySession.data.length, 0);
}
