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

/**
 * Test comment deletion by author.
 *
 * Scenario: A comment author successfully deletes their own comment.
 *
 * Prerequisites:
 * 1. Member joins and authenticates
 * 2. Member creates a community (becoming owner)
 * 3. Member creates a post in that community
 * 4. Member creates a comment on that post
 *
 * Test execution: The same member (comment author) deletes their comment.
 *
 * Validations:
 * - Response returns void (204 No Content)
 * - No authorization error occurs (requester is the author)
 */
export async function test_api_comment_deletion_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member joins and authenticates
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Member creates a community (becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Member creates a post in that community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Member creates a comment on that post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // 5. Delete the comment as the author
  await api.functional.communityPlatform.member.communities.comments.erase(
    memberConnection,
    {
      communityId: community.id,
      commentId: comment.id,
    },
  );
  // Validation: Attempting to delete again should fail (already deleted)
  await TestValidator.error("comment already deleted", async () => {
    await api.functional.communityPlatform.member.communities.comments.erase(
      memberConnection,
      {
        communityId: community.id,
        commentId: comment.id,
      },
    );
  });
}
