import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the created community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.paragraph({ sentences: 3 }),
        linkUrl: null,
        imageUrl: null,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: originalContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store original content for verification
  const originalCommentContent = comment.content;
  // 6. Edit the comment (this creates a snapshot in the backend)
  const updatedContent = RandomGenerator.paragraph({ sentences: 3 });
  const updatedComment =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: updatedContent,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // Verify the comment was updated
  TestValidator.equals(
    "comment content updated",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.equals("comment id unchanged", updatedComment.id, comment.id);
  TestValidator.notEquals(
    "content changed after edit",
    updatedComment.content,
    originalCommentContent,
  );
  // Note: The snapshot creation happens in the backend during update.
  // The current API spec for update returns ICommunityPlatformComment without snapshot ID.
  // To retrieve a snapshot, we would need either:
  // 1. The update endpoint to return the snapshot ID, OR
  // 2. A list snapshots endpoint for the comment
  //
  // Since neither exists in the current API spec, the snapshot retrieval part
  // of this test cannot be completed. The comment update itself is verified above.
  //
  // If/when the API provides snapshot ID access, the following would be added:
  // const snapshot = await api.functional.communityPlatform.comments.snapshots.at(
  //   memberConnection,
  //   {
  //     commentId: comment.id,
  //     snapshotId: snapshotIdFromSystem,
  //   },
  // );
  // TestValidator.equals("snapshot content is original", snapshot.content, originalCommentContent);
}
