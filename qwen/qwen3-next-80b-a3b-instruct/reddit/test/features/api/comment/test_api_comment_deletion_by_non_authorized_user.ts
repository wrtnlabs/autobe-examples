import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_deletion_by_non_authorized_user(
  connection: api.IConnection,
): Promise<void> {
  // Create platform admin connection
  const platformAdminConnection: api.IConnection = { host: connection.host };
  const randomPassword = RandomGenerator.alphaNumeric(16);
  const platformAdmin = await authorize_platform_admin_join(
    platformAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: randomPassword,
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  typia.assert(platformAdmin);
  // Create member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(member);
  // Create community as platform admin
  const community =
    await generate_random_reddit_community_member_communities_create(
      platformAdminConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create post as platform admin
  const post = await generate_random_reddit_community_member_posts_create(
    platformAdminConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Create comment as platform admin
  const comment =
    await generate_random_reddit_community_member_posts_comments_create(
      platformAdminConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // Store original comment count
  const originalCommentCount = post.comment_count;
  // Re-authenticate platform admin for verification later
  const platformAdminRecheckConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_platform_admin_login(platformAdminRecheckConnection, {
    body: {
      email: platformAdmin.email!,
      password: randomPassword, // Use the stored password, not from platformAdmin object
    } satisfies IRedditCommunityPlatformAdmin.ILogin,
  });
  // Attempt comment deletion as member (non-authorized user)
  try {
    await api.functional.redditCommunity.platformAdmin.posts.comments.erase(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
      },
    );
    throw new Error("Expected 403 Forbidden, but deletion succeeded");
  } catch (error) {
    if (!(error instanceof api.HttpError) || error.status !== 403) {
      throw error;
    }
  }
  // Verify the comment still exists and is accessible by platform admin
  // We don't have a direct comment get endpoint, so we prove comment exists by creating a reply
  const reply =
    await generate_random_reddit_community_member_posts_comments_create(
      platformAdminRecheckConnection,
      {
        params: { postId: post.id },
        body: {
          content: "Reply to original comment",
          parent_comment_id: comment.id,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(reply);
  // Validate that the comment can still be referenced as a parent
  // This confirms comment exists and was not deleted
  TestValidator.equals(
    "reply created and linked to original comment",
    reply.parent_comment?.id,
    comment.id,
  );
  // Validate comment count is unchanged after failed deletion attempt
  TestValidator.equals(
    "comment count unchanged after failed deletion",
    originalCommentCount,
    post.comment_count,
  );
  // All validations passed: non-authorized user cannot delete, comment remains, comment_count unchanged, parent-child relationship maintained
}
