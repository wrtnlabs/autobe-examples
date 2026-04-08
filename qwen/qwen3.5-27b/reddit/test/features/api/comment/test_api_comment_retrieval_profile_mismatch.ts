import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_communities_subscriptions_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that retrieving a comment with mismatched profileId and commentId returns 404 error.
 *
 * Validates the authorization mechanism for comment retrieval by ensuring that the profileId parameter must match the comment's actual author. When a mismatched profile ID is provided, the system should reject the request with a 404 Not Found error, preventing unauthorized access through profile manipulation.
 *
 * This test verifies that the comment retrieval endpoint enforces proper ownership validation, ensuring users cannot access comments by guessing or manipulating profile IDs in the URL path.
 *
 * 1. Create member account A as the comment author.
 * 2. Create member account B as a different user.
 * 3. Subscribe member A to an existing community.
 * 4. Create a post in the community as member A.
 * 5. Create a comment on the post as member A.
 * 6. Attempt to retrieve the comment using member B's profile ID (mismatched).
 * 7. Verify the request fails with HTTP 404 Not Found error.
 */
export async function test_api_comment_retrieval_profile_mismatch(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Create member account B (different user)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(memberB);
  // 3. Generate a community ID for subscription
  // Note: This assumes a community with this ID exists in the system
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Subscribe member A to the community
  await generate_random_reddit_clone_member_communities_subscriptions_create(
    memberAConnection,
    {
      params: { communityId },
    },
  );
  // 5. Create a post as member A
  const post = await generate_random_reddit_clone_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: communityId,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create a comment on the post as member A
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberAConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCloneComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Attempt to retrieve the comment using member B's profile ID (mismatched)
  // The profileId should be member B's profile ID, but the comment was created by member A
  // This should return 404 Not Found
  await TestValidator.httpError(
    "mismatched profile-comment returns 404",
    404,
    async () => {
      await api.functional.redditClone.profiles.comments.at(connection, {
        profileId: memberB.id,
        commentId: comment.id,
      });
    },
  );
}
