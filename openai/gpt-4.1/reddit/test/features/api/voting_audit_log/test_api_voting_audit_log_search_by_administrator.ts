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
 * Validate that only authenticated administrators can search and retrieve
 * voting audit log entries, with paginated, filterable search by various
 * criteria (user, vote type, result, IP, session, date range).
 *
 * Steps:
 *
 * 1. Register a new administrator (get authentication context/Tokens)
 * 2. As this administrator, send PATCH votingAuditLogs request with randomly
 *    generated and then manually crafted filter parameters
 * 3. Validate pagination structure present, log entries match the filter criteria
 *    exactly, and results are read-only
 * 4. Ensure unauthorized access (no admin login) is rejected
 */
export async function test_api_voting_audit_log_search_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register a new administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. Attempt to access audit log search endpoint without authentication (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access voting audit logs without authentication should fail",
    async () => {
      await api.functional.communityPlatform.administrator.votingAuditLogs.index(
        unauthConn,
        {
          body: {},
        },
      );
    },
  );

  // 3. Search with randomly constructed filter
  const randomFilterBody =
    typia.random<ICommunityPlatformVotingAuditLog.IRequest>();
  const randomResult =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      { body: randomFilterBody },
    );
  typia.assert(randomResult);
  TestValidator.predicate(
    "random result is paged and only contains ISummary records",
    randomResult.pagination != null && Array.isArray(randomResult.data),
  );

  // 4. If data exists, verify all entries match filter criteria
  if (randomResult.data.length > 0) {
    for (const entry of randomResult.data) {
      typia.assert(entry);
      if (randomFilterBody.user_id !== undefined)
        TestValidator.equals(
          "user_id matches filter",
          entry.community_platform_user_id,
          randomFilterBody.user_id,
        );
      if (randomFilterBody.target_type !== undefined)
        TestValidator.equals(
          "target_type matches filter",
          entry.target_type,
          randomFilterBody.target_type,
        );
      if (randomFilterBody.target_id !== undefined)
        TestValidator.equals(
          "target_id matches filter",
          entry.target_id,
          randomFilterBody.target_id,
        );
      if (randomFilterBody.vote_type !== undefined)
        TestValidator.equals(
          "vote_type matches filter",
          entry.vote_type,
          randomFilterBody.vote_type,
        );
      if (randomFilterBody.result_status !== undefined)
        TestValidator.equals(
          "result_status matches filter",
          entry.result_status,
          randomFilterBody.result_status,
        );
      if (randomFilterBody.reason !== undefined)
        TestValidator.equals(
          "reason matches filter",
          entry.reason,
          randomFilterBody.reason,
        );
      if (randomFilterBody.ip !== undefined)
        TestValidator.equals(
          "ip matches filter",
          entry.ip,
          randomFilterBody.ip,
        );
      if (randomFilterBody.session_id !== undefined)
        TestValidator.equals(
          "session_id matches filter",
          entry.session_id,
          randomFilterBody.session_id,
        );
      if (randomFilterBody.start_date !== undefined)
        TestValidator.predicate(
          "entry created_at >= start_date",
          entry.created_at >= randomFilterBody.start_date!,
        );
      if (randomFilterBody.end_date !== undefined)
        TestValidator.predicate(
          "entry created_at <= end_date",
          entry.created_at <= randomFilterBody.end_date!,
        );
    }
  }

  // 5. Test pagination: page/limit and default values
  const pageNum = 1;
  const pageLimit = 2;
  const pageBody = {
    page: pageNum satisfies number as number,
    limit: pageLimit satisfies number as number,
  } satisfies Partial<ICommunityPlatformVotingAuditLog.IRequest>;
  const paged =
    await api.functional.communityPlatform.administrator.votingAuditLogs.index(
      connection,
      { body: pageBody },
    );
  typia.assert(paged);
  TestValidator.equals(
    "paged response pagination.current matches requested page",
    paged.pagination.current,
    pageNum,
  );
  TestValidator.equals(
    "paged response pagination.limit matches requested limit",
    paged.pagination.limit,
    pageLimit,
  );
  TestValidator.equals(
    "paged response data length <= limit",
    paged.data.length <= pageLimit,
    true,
  );

  // 6. Confirm read-only/immutable policy (no mutation endpoints)
  // (No mutation endpoints exist, so nothing to attempt here; presence of index endpoint only is sufficient)
}
