import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

/**
 * Validate administrator can retrieve voting rate limit details.
 *
 * This test covers the entire privileged detail retrieval flow for voting rate
 * limit records.
 *
 * 1. Register a new platform administrator with random email and password.
 * 2. Authenticate and perform a paginated search to fetch the voting rate limit
 *    list.
 * 3. Ensure at least one record exists; extract a valid votingRateLimitId.
 * 4. Retrieve details for the given votingRateLimitId with the GET operation.
 * 5. Validate that all expected detail fields match (id, window_start, etc.) and
 *    types are correct.
 * 6. Cross-check that the detail data aligns with the summary record from the list
 *    response.
 */
export async function test_api_voting_rate_limit_detail_access_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register administrator and log in
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);
  TestValidator.equals(
    "administrator email matches registration",
    adminAuth.email,
    adminEmail,
  );
  TestValidator.predicate(
    "administrator token present",
    !!adminAuth.token && typeof adminAuth.token.access === "string",
  );

  // 2. Use administrator privileges to fetch voting rate limit summaries
  const summaryPage: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.administrator.votingRateLimits.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<200>,
        } satisfies ICommunityPlatformVotingRateLimit.IRequest,
      },
    );
  typia.assert(summaryPage);
  TestValidator.predicate(
    "at least one voting rate limit record exists",
    summaryPage.data.length > 0,
  );

  // 3. Pick a random voting rate limit record
  const summary = RandomGenerator.pick(summaryPage.data);
  typia.assert(summary);

  // 4. Retrieve details using the summary id
  const detail: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.administrator.votingRateLimits.at(
      connection,
      {
        votingRateLimitId: summary.id,
      },
    );
  typia.assert(detail);
  TestValidator.equals("detailed id matches summary id", detail.id, summary.id);
  TestValidator.equals(
    "detailed window_start matches summary",
    detail.window_start,
    summary.window_start,
  );
  TestValidator.equals(
    "detailed window_end matches summary",
    detail.window_end,
    summary.window_end,
  );
  TestValidator.equals(
    "detailed status matches summary",
    detail.status,
    summary.status,
  );
  TestValidator.equals(
    "detailed vote_count matches summary",
    detail.vote_count,
    summary.vote_count,
  );
  TestValidator.equals(
    "detailed violation_count matches summary",
    detail.violation_count,
    summary.violation_count,
  );
  TestValidator.equals(
    "detailed created_at matches summary",
    detail.created_at,
    summary.created_at,
  );
  TestValidator.equals(
    "detailed updated_at matches summary",
    detail.updated_at,
    summary.updated_at,
  );
  TestValidator.equals(
    "detailed user summary matches",
    detail.user,
    summary.user,
  );
  TestValidator.equals("detailed ip matches summary", detail.ip, summary.ip);
}
