import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_comments_create } from "../../../generate/generate_random_reddit_like_member_posts_comments_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_comment } from "../../../prepare/prepare_random_reddit_like_comment";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test moderator attempts to delete an already deleted comment.
 *
 * This test validates the soft-deletion behavior where:
 * 1. An author deletes their own comment
 * 2. A moderator subsequently attempts to delete the same comment
 * 3. The system returns 404 Not Found since the comment is already deleted
 */
export async function test_api_comment_moderator_deletes_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: IRedditLikeModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
      } satisfies IRedditLikeModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IRedditLikeMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.name(1),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditLikeMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 3: Create community as moderator
  const community: IRedditLikeCommunity =
    await generate_random_reddit_like_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 4: Subscribe member to community
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 5: Create post as member
  const post: IRedditLikePost =
    await generate_random_reddit_like_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.name(3),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    });
  typia.assert(post);
  // Step 6: Create comment on post as member
  const comment: IRedditLikeComment =
    await generate_random_reddit_like_member_posts_comments_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Step 7: Delete comment as the original author (member)
  await api.functional.redditLike.member.posts.comments.erase(
    memberConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // Step 8: Attempt to delete already-deleted comment as moderator
  // This should throw HTTP 404 Not Found error
  await TestValidator.httpError(
    "should return 404 when moderator attempts to delete already deleted comment",
    404,
    async () => {
      await api.functional.redditLike.moderator.posts.comments.erase(
        moderatorConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
