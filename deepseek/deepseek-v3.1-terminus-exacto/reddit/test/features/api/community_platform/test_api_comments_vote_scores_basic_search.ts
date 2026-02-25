import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentVoteScore";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test basic comment vote score search functionality with minimal filters.
 * Create a user account, authenticate, and search comment vote scores without
 * any filters to verify the endpoint returns paginated results with default
 * sorting. Validate pagination metadata and vote score calculation accuracy.
 */
export async function test_api_comments_vote_scores_basic_search(
  connection: api.IConnection,
): Promise<void> {
  // Create user account and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}.jpg`,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Search comment vote scores with no filters
  const response =
    await api.functional.communityPlatform.user.comments.vote_scores.index(
      userConnection,
      {
        body: {} satisfies ICommunityPlatformCommentVoteScore.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.equals(
    "current page defaults to 1",
    response.pagination.current,
    1,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate vote score records if any exist
  if (response.data.length > 0) {
    for (const voteScore of response.data) {
      typia.assert(voteScore);
      // Validate score calculation
      TestValidator.equals(
        "score equals upvote_count minus downvote_count",
        voteScore.score,
        voteScore.upvote_count - voteScore.downvote_count,
      );
      // Validate basic properties
      TestValidator.predicate(
        "upvote_count is non-negative",
        voteScore.upvote_count >= 0,
      );
      TestValidator.predicate(
        "downvote_count is non-negative",
        voteScore.downvote_count >= 0,
      );
      TestValidator.predicate(
        "last_updated_at is valid date",
        !isNaN(new Date(voteScore.last_updated_at).getTime()),
      );
    }
  }
}
