import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

/**
 * Verify that a platform administrator receives a successful, well-formed empty
 * paginated result when querying voting rate limits for a member user who has
 * no rate limit window records.
 *
 * Business context: Platform administrators and internal tools need to inspect
 * how voting rate limits are applied to member users. When a member user has no
 * configured or historical rate-limit windows in the
 * `community_platform_voting_rate_limits` table, the index endpoint must still
 * behave as a normal successful read, returning an empty page instead of an
 * error. This allows admin UIs to represent a clean "no active or historical
 * limits" state without special-case error handling.
 *
 * Test steps:
 *
 * 1. Register and authenticate a new platform administrator via POST
 *    /auth/platformAdmin/join using the SDK function
 *    api.functional.auth.platformAdmin.join. This ensures the connection
 *    carries a valid platformAdmin JWT for subsequent calls.
 * 2. Generate a structurally valid random UUID to act as the memberUserId. Because
 *    no member-user creation/listing APIs are available in the current
 *    materials, this UUID is used as a stand-in for a member user that has no
 *    rate limit records. The rate-limit index endpoint is documented to return
 *    an empty page when no rows exist, so using any valid UUID that does not
 *    accidentally map to a row is acceptable in this synthetic test.
 * 3. Call PATCH
 *    /communityPlatform/platformAdmin/memberUsers/{memberUserId}/votingRateLimits
 *    through
 *    api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index,
 *    passing the generated UUID as memberUserId.
 * 4. Use typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>() on the
 *    response to ensure it strictly conforms to the documented DTO, including
 *    pagination metadata and the array of
 *    ICommunityPlatformVotingRateLimit.ISummary.
 * 5. Using TestValidator.equals and TestValidator.predicate, validate that:
 *
 *    - Pagination.records === 0
 *    - Pagination.pages === 0 (platform convention for an empty dataset)
 *    - Data is an array and has length 0. These checks confirm that the endpoint
 *         represents the "no data" state as an empty page rather than as an
 *         error or null.
 *
 * Constraints and notes:
 *
 * - Do not attempt to verify HTTP status codes directly; success is implied by
 *   the lack of thrown HttpError and by having a valid response.
 * - Do not manipulate connection.headers directly; authentication is handled by
 *   the SDK after the join call.
 * - Do not construct any type-error scenarios or deliberately invalid payloads;
 *   all requests must be fully type-safe.
 */
export async function test_api_voting_rate_limits_index_for_member_user_with_no_windows(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new platform administrator.
  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: typia.random<ICommunityPlatformPlatformadmin.IJoin>(),
    });
  typia.assert(platformAdmin);

  // 2. Generate a structurally valid random UUID for a member user
  //    that has no voting rate limit windows.
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the voting rate limits index endpoint as the authenticated
  //    platform administrator.
  const page: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );

  // 4. Assert response type correctness.
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(page);

  // 5. Business validations: confirm empty pagination semantics.
  TestValidator.equals(
    "empty result should report zero records",
    0,
    page.pagination.records,
  );
  TestValidator.equals(
    "empty result should report zero pages",
    0,
    page.pagination.pages,
  );
  TestValidator.predicate(
    "data array should be present and empty",
    () => Array.isArray(page.data) && page.data.length === 0,
  );
}
