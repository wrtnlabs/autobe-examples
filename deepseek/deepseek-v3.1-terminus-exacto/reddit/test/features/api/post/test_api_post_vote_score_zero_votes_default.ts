import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVoteScore } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteScore";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_vote_score_zero_votes_default(
  connection: api.IConnection,
): Promise<void> {
  // Create a user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Register and authenticate a user
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a post using the authenticated user connection
  // Note: The community_name must reference an existing community
  // Since we don't have community creation API available, we'll use a simple name
  // In a real scenario, this would need to be an existing community
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_name: "test-community",
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Retrieve the vote score for the newly created post
  const voteScore =
    await api.functional.communityPlatform.user.posts.vote_score.at(
      userConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(voteScore);
  // Validate that the vote score has default values for a post with no votes
  TestValidator.equals("upvote count should be 0", voteScore.upvote_count, 0);
  TestValidator.equals(
    "downvote count should be 0",
    voteScore.downvote_count,
    0,
  );
  TestValidator.equals("total score should be 0", voteScore.total_score, 0);
  TestValidator.equals(
    "last updated at should be null",
    voteScore.last_updated_at,
    null,
  );
  // Validate the vote score record structure
  TestValidator.predicate(
    "vote score record should have valid UUID",
    typia.is<string & tags.Format<"uuid">>(voteScore.id),
  );
  TestValidator.predicate(
    "created at should be valid date-time",
    typia.is<string & tags.Format<"date-time">>(voteScore.created_at),
  );
  TestValidator.predicate(
    "updated at should be valid date-time",
    typia.is<string & tags.Format<"date-time">>(voteScore.updated_at),
  );
}
