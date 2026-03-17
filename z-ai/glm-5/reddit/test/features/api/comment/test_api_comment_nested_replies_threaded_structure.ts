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

export async function test_api_comment_nested_replies_threaded_structure(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test retrieval of a comment with nested threaded replies at multiple depth levels.
   * Validates the unlimited reply depth and tree-like discussion structure.
   */
  // Step 1: Create member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create community as container for posts
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // Step 3: Create post in the community
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
  // Step 4: Create top-level comment (depth 0)
  const topLevelComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(topLevelComment);
  // Step 5: Create reply to top-level comment (depth 1)
  const depth1Reply =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parent_comment_id: topLevelComment.id,
        },
      },
    );
  typia.assert(depth1Reply);
  // Step 6: Create reply to depth-1 comment (depth 2)
  const depth2Reply =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parent_comment_id: depth1Reply.id,
        },
      },
    );
  typia.assert(depth2Reply);
  // Step 7: Create reply to depth-2 comment (depth 3)
  const depth3Reply =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          parent_comment_id: depth2Reply.id,
        },
      },
    );
  typia.assert(depth3Reply);
  // Step 8: Retrieve the top-level comment with nested replies
  const retrievedComment =
    await api.functional.communityPlatform.posts.comments.at(memberConnection, {
      postId: post.id,
      commentId: topLevelComment.id,
    });
  typia.assert(retrievedComment);
  // Step 9: Validate the top-level comment structure
  TestValidator.equals(
    "top-level comment id matches",
    retrievedComment.id,
    topLevelComment.id,
  );
  TestValidator.equals(
    "top-level comment content matches",
    retrievedComment.content,
    topLevelComment.content,
  );
  TestValidator.predicate(
    "top-level comment has author",
    retrievedComment.author.id === member.id,
  );
  TestValidator.equals(
    "top-level comment parent is null",
    retrievedComment.parentComment,
    null,
  );
  TestValidator.predicate(
    "top-level comment has replies array",
    retrievedComment.replies.length > 0,
  );
  // Step 10: Validate depth-1 reply in nested structure
  TestValidator.predicate(
    "replies array contains depth-1 reply",
    retrievedComment.replies.some((r) => r.id === depth1Reply.id),
  );
  const depth1FromResponse = retrievedComment.replies.find(
    (r) => r.id === depth1Reply.id,
  )!;
  TestValidator.equals(
    "depth-1 reply content matches",
    depth1FromResponse.content,
    depth1Reply.content,
  );
  TestValidator.predicate(
    "depth-1 reply has author",
    depth1FromResponse.author.id === member.id,
  );
  TestValidator.equals(
    "depth-1 parent references top-level",
    depth1FromResponse.parentComment?.id,
    topLevelComment.id,
  );
  // Step 11: Validate depth-2 reply nested in depth-1
  TestValidator.predicate(
    "depth-1 reply has nested replies",
    depth1FromResponse.replies.length > 0,
  );
  TestValidator.predicate(
    "depth-1 replies contains depth-2",
    depth1FromResponse.replies.some((r) => r.id === depth2Reply.id),
  );
  const depth2FromResponse = depth1FromResponse.replies.find(
    (r) => r.id === depth2Reply.id,
  )!;
  TestValidator.equals(
    "depth-2 reply content matches",
    depth2FromResponse.content,
    depth2Reply.content,
  );
  TestValidator.predicate(
    "depth-2 reply has author",
    depth2FromResponse.author.id === member.id,
  );
  TestValidator.equals(
    "depth-2 parent references depth-1",
    depth2FromResponse.parentComment?.id,
    depth1Reply.id,
  );
  // Step 12: Validate depth-3 reply nested in depth-2
  TestValidator.predicate(
    "depth-2 reply has nested replies",
    depth2FromResponse.replies.length > 0,
  );
  TestValidator.predicate(
    "depth-2 replies contains depth-3",
    depth2FromResponse.replies.some((r) => r.id === depth3Reply.id),
  );
  const depth3FromResponse = depth2FromResponse.replies.find(
    (r) => r.id === depth3Reply.id,
  )!;
  TestValidator.equals(
    "depth-3 reply content matches",
    depth3FromResponse.content,
    depth3Reply.content,
  );
  TestValidator.predicate(
    "depth-3 reply has author",
    depth3FromResponse.author.id === member.id,
  );
  TestValidator.equals(
    "depth-3 parent references depth-2",
    depth3FromResponse.parentComment?.id,
    depth2Reply.id,
  );
  // Step 13: Validate unlimited depth support (4 levels: 0 -> 1 -> 2 -> 3)
  TestValidator.predicate(
    "thread structure supports 4-level depth",
    depth3FromResponse.replies !== undefined,
  );
}
