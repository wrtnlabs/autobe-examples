import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentModeration";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_moderation } from "../../../prepare/prepare_random_community_platform_comment_moderation";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_admin_posts_comments_moderations_create } from "../../../generate/generate_random_community_platform_admin_posts_comments_moderations_create";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_moderation_search_no_results(
  connection: api.IConnection
): Promise<void> {
  /**
   * Test search functionality of comment moderation with filters that yield zero results
   *
   * This comprehensive test validates that the comment moderation search endpoint
   * correctly handles filter combinations that produce empty result sets.
   */

  // 1. Create two admin accounts
  const adminConnection1: api.IConnection = { host: connection.host };
  const adminConnection2: api.IConnection = { host: connection.host };

  const admin1 = await authorize_admin_join(adminConnection1, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });

  // 2. Create user account for post/comment creation
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
    },
  });

  // 3. Create community
  const community = await generate_random_community_platform_user_communities_create(userConnection, {
    body: {
      name: RandomGenerator.alphabets(10),
      description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  });
  typia.assert(community);

  // 4. Create post
  const post = await generate_random_community_platform_user_posts_create(userConnection, {
    body: {
      title: RandomGenerator.paragraph({ sentences: 2 }),
      community_name: community.name,
      post_type: "text",
      text_content: RandomGenerator.paragraph({ sentences: 5 }),
    },
  });
  typia.assert(post);

  // 5. Create first comment with moderation actions
  const comment1 = await generate_random_community_platform_user_posts_comments_create(userConnection, {
    body: {
      content: RandomGenerator.paragraph({ sentences: 3 }),
    },
    params: { postId: post.id },
  });
  typia.assert(comment1);

  // 6. Create second comment without moderation actions (for zero results test)
  const comment2 = await generate_random_community_platform_user_posts_comments_create(userConnection, {
    body: {
      content: RandomGenerator.paragraph({ sentences: 3 }),
    },
    params: { postId: post.id },
  });
  typia.assert(comment2);

  // 7. Create moderation actions on first comment
  // Use action types: 'delete' and 'approve' (not 'remove_ban')
  const moderation1 = await generate_random_community_platform_admin_posts_comments_moderations_create(adminConnection1, {
    body: {
      action_type: "delete",
      reason: "Violation of community guidelines",
      status: "active",
      duration_hours: null,
    },
    params: {
      postId: post.id,
      commentId: comment1.id,
    },
  });
  typia.assert(moderation1);

  const moderation2 = await generate_random_community_platform_admin_posts_comments_moderations_create(adminConnection1, {
    body: {
      action_type: "approve",
      reason: "Content meets community standards",
      status: "active",
      duration_hours: null,
    },
    params: {
      postId: post.id,
      commentId: comment1.id,
    },
  });
  typia.assert(moderation2);

  // Save timestamps for date range filtering
  const beforeCreation = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const afterCreation = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(); // 1 day after

  // 8. Test filter combinations that should produce zero results

  // Test 1: Filter by action_type that doesn't exist (remove_ban)
  const filter1: ICommunityPlatformCommentModeration.IRequest = {
    action_type: "remove_ban",
  };
  
  const result1 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter1,
  });
  typia.assert(result1);

  TestValidator.equals("empty results for non-existent action_type", result1.data, []);
  TestValidator.equals("records=0 for non-existent action_type", result1.pagination.records, 0);
  TestValidator.equals("pages=0 for non-existent action_type", result1.pagination.pages, 0);

  // Test 2: Filter by status that doesn't exist (expired)
  const filter2: ICommunityPlatformCommentModeration.IRequest = {
    status: "expired",
  };
  
  const result2 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter2,
  });
  typia.assert(result2);

  TestValidator.equals("empty results for non-existent status", result2.data, []);
  TestValidator.equals("records=0 for non-existent status", result2.pagination.records, 0);
  TestValidator.equals("pages=0 for non-existent status", result2.pagination.pages, 0);

  // Test 3: Filter by moderator_id of second admin (different moderator)
  const filter3: ICommunityPlatformCommentModeration.IRequest = {
    moderator_id: admin2.id,
  };
  
  const result3 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter3,
  });
  typia.assert(result3);

  TestValidator.equals("empty results for different moderator", result3.data, []);
  TestValidator.equals("records=0 for different moderator", result3.pagination.records, 0);
  TestValidator.equals("pages=0 for different moderator", result3.pagination.pages, 0);

  // Test 4: Filter by date range outside creation timestamps
  const filter4: ICommunityPlatformCommentModeration.IRequest = {
    created_at_from: afterCreation,
  };
  
  const result4 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter4,
  });
  typia.assert(result4);

  TestValidator.equals("empty results for future date range", result4.data, []);
  TestValidator.equals("records=0 for future date range", result4.pagination.records, 0);
  TestValidator.equals("pages=0 for future date range", result4.pagination.pages, 0);

  // Test 5: Filter by reason text that doesn't match
  const filter5: ICommunityPlatformCommentModeration.IRequest = {
    reason: "this text does not exist in any moderation reason",
  };
  
  const result5 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter5,
  });
  typia.assert(result5);

  TestValidator.equals("empty results for non-matching reason", result5.data, []);
  TestValidator.equals("records=0 for non-matching reason", result5.pagination.records, 0);
  TestValidator.equals("pages=0 for non-matching reason", result5.pagination.pages, 0);

  // Test 6: Search on comment with no moderation actions
  const filter6: ICommunityPlatformCommentModeration.IRequest = {};
  
  const result6 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment2.id,
    body: filter6,
  });
  typia.assert(result6);

  TestValidator.equals("empty results for comment without moderations", result6.data, []);
  TestValidator.equals("records=0 for comment without moderations", result6.pagination.records, 0);
  TestValidator.equals("pages=0 for comment without moderations", result6.pagination.pages, 0);

  // Test 7: Combined filters that produce zero results
  const filter7: ICommunityPlatformCommentModeration.IRequest = {
    action_type: "delete",
    moderator_id: admin2.id, // Different moderator
  };
  
  const result7 = await api.functional.communityPlatform.admin.posts.comments.moderations.index(adminConnection1, {
    postId: post.id,
    commentId: comment1.id,
    body: filter7,
  });
  typia.assert(result7);

  TestValidator.equals("empty results for combined filter mismatch", result7.data, []);
  TestValidator.equals("records=0 for combined filter mismatch", result7.pagination.records, 0);
  TestValidator.equals("pages=0 for combined filter mismatch", result7.pagination.pages, 0);
}