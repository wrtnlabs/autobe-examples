import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_comment_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  // 2. Create community (member becomes owner automatically)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Create post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // 4. Create top-level comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.communityPlatform.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 5. Validate comment properties
  TestValidator.equals("content matches", comment.content, commentContent);
  TestValidator.equals("vote score is zero", comment.voteScore, 0);
  TestValidator.equals("parent comment is null", comment.parentComment, null);
  TestValidator.equals("replies array is empty", comment.replies.length, 0);
  TestValidator.equals("deleted_at is null", comment.deletedAt, null);
  TestValidator.predicate("has valid UUID", comment.id.length === 36);
  TestValidator.predicate(
    "has created_at timestamp",
    comment.createdAt !== null,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    comment.updatedAt !== null,
  );
  TestValidator.equals("author ID matches", comment.author.id, member.id);
}
