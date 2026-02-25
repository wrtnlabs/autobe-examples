import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test the basic functionality of retrieving karma impact records for an authenticated user.
 * This scenario validates that users can access their voting history with default pagination settings.
 * The test verifies that the response contains pagination metadata and an array of karma impact records
 * with proper structure including user details, karma delta values (+1 for upvotes, -1 for downvotes),
 * and timestamps. Validates that the karma delta values correctly reflect the voting system rules
 * where upvotes increase karma by 1 and downvotes decrease karma by 1.
 */
export async function test_api_vote_karma_impacts_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the user
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a new user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Call the vote karma impacts endpoint with default pagination parameters
  const response =
    await api.functional.communityPlatform.user.vote_karma_impacts.index(
      userConnection,
      {
        body: {
          // Use default pagination (page: null, limit: null)
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata business logic
  TestValidator.predicate(
    "current page is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate each karma impact record if data exists
  if (response.data.length > 0) {
    for (const impact of response.data) {
      // Validate karma delta follows voting system rules (+1 for upvotes, -1 for downvotes)
      TestValidator.predicate(
        "karma delta is valid",
        impact.karma_delta === 1 || impact.karma_delta === -1,
      );
    }
  }
}
