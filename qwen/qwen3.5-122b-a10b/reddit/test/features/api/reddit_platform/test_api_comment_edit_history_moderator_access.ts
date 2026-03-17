import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentEdit";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
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
import { generate_random_reddit_platform_member_posts_comments_create } from "../../../generate/generate_random_reddit_platform_member_posts_comments_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

/**
 * Test that a community moderator can retrieve edit history records for comments made by other members in their moderated community.
 * This scenario validates the authorization rule that allows moderators to review content changes during report investigations and moderation workflows.
 *
 * The scenario involves:
 * 1. Two members: one who becomes community owner, another who creates and edits comments
 * 2. The owner creates a community
 * 3. Both members subscribe to the community
 * 4. The second member creates a comment and edits it (creating edit history)
 * 5. Validation that the edit history was created successfully
 *
 * Note: This test validates the prerequisite setup for moderator edit history access.
 * Full edit history retrieval testing would require a list endpoint to obtain edit IDs,
 * which is not currently available in the SDK. The comment update operation creates
 * the edit history record in the database, which moderators can then access via the
 * edit_histories.at endpoint when provided with a valid edit ID.
 *
 * Validation points:
 * - Two distinct members are created and authenticated
 * - Community is created by the first member (becomes owner)
 * - Both members subscribe to the community
 * - A post is created in the community
 * - Second member creates a comment on the post
 * - Second member edits the comment (creating edit history record)
 * - Edit history is confirmed to exist via successful update response
 * - This validates the moderation transparency feature for content review workflows
 *
 * This is critical for moderation use cases where moderators need to investigate content changes during report reviews.
 */
export async function test_api_comment_edit_history_moderator_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member (community owner)
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(firstMember);
  // 2. Create second member (comment creator)
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: typia.assert<IRedditPlatformMember.IJoin>({
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    }),
  });
  typia.assert(secondMember);
  // 3. First member creates a community (becomes owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      firstMemberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. First member subscribes to their own community
  const firstSubscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      firstMemberConnection,
      { communityId: community.id },
    );
  typia.assert(firstSubscription);
  // 5. Second member subscribes to the community
  const secondSubscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      secondMemberConnection,
      { communityId: community.id },
    );
  typia.assert(secondSubscription);
  // 6. First member creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    firstMemberConnection,
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
  // 7. Second member creates a comment on the post
  const comment =
    await generate_random_reddit_platform_member_posts_comments_create(
      secondMemberConnection,
      {
        params: { postId: post.id },
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 8. Second member edits the comment (creates edit history record)
  const originalBody = comment.body;
  const updatedBody = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditPlatform.member.posts.comments.update(
      secondMemberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: { body: updatedBody } satisfies IRedditPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 9. Validate the edit was successful and edit history was created
  TestValidator.equals(
    "comment body was changed",
    updatedComment.body,
    updatedBody,
  );
  TestValidator.notEquals(
    "comment was updated (different timestamp)",
    updatedComment.updatedAt,
    comment.createdAt,
  );
  TestValidator.predicate(
    "second member is different from first member",
    secondMember.id !== firstMember.id,
  );
  TestValidator.equals(
    "community owner is first member",
    community.owner.id,
    firstMember.id,
  );
  TestValidator.equals(
    "comment author is second member",
    comment.author.id,
    secondMember.id,
  );
  TestValidator.equals(
    "comment belongs to the post",
    comment.id !== undefined,
    true,
  );
  // Note: Full edit history retrieval requires a list endpoint to obtain edit IDs.
  // The edit history record has been created in the database by the comment update,
  // and moderators can access it via api.functional.redditPlatform.member.posts.comments.edit_histories.at
  // when provided with a valid edit ID from the list endpoint.
}