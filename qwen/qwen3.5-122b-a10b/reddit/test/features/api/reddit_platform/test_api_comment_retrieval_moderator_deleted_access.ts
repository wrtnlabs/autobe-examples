import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_retrieval_moderator_deleted_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  // 2. Create community (moderator becomes owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create regular member (non-moderator)
  const regularConnection: api.IConnection = { host: connection.host };
  const regularAuth = await authorize_member_join(regularConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(regularAuth);
  // 4. Subscribe regular member to community (needed to create posts)
  // Note: This endpoint may not exist, so we'll just create post directly
  // and let the server handle subscription validation if required
  // 5. Create post in community (using moderator)
  const post = await generate_random_reddit_platform_member_posts_create(
    moderatorConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 6. Create comment on post (using moderator)
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      moderatorConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 7. Delete the comment (soft delete)
  await api.functional.redditPlatform.member.posts.comments.erase(
    moderatorConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // 8. Moderator can retrieve deleted comment
  const moderatorRetrievedComment =
    await api.functional.redditPlatform.posts.comments.at(moderatorConnection, {
      postId: post.id,
      commentId: comment.id,
    });
  typia.assert(moderatorRetrievedComment);
  // Validate deleted comment has deletedAt timestamp
  TestValidator.predicate(
    "deleted comment has deletedAt timestamp",
    moderatorRetrievedComment.deletedAt !== null &&
      moderatorRetrievedComment.deletedAt !== undefined,
  );
  // Validate comment data is intact
  TestValidator.equals(
    "comment id matches",
    moderatorRetrievedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment body matches",
    moderatorRetrievedComment.body,
    comment.body,
  );
  // 9. Regular member cannot retrieve deleted comment (should get 404)
  await TestValidator.httpError(
    "regular member cannot access deleted comment",
    404,
    async () => {
      await api.functional.redditPlatform.posts.comments.at(regularConnection, {
        postId: post.id,
        commentId: comment.id,
      });
    },
  );
}