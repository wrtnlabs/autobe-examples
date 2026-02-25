import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentModeration";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommentModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentModeration";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_comments_create } from "../../../generate/generate_random_community_platform_user_posts_comments_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_moderator_comment_moderations_search_all(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator accounts
  const moderator1Connection: api.IConnection = { host: connection.host };
  const moderator1 = await authorize_moderator_join(moderator1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  const moderator2Connection: api.IConnection = { host: connection.host };
  const moderator2 = await authorize_moderator_join(moderator2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create user and community
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  // Create post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Create controversial comment
  const comment =
    await generate_random_community_platform_user_posts_comments_create(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  // Search for moderation actions (should be empty initially)
  const searchBody: ICommunityPlatformCommentModeration.IRequest = {
    action_type: null,
    status: null,
    moderator_id: null,
    reason: null,
    created_at_from: null,
    created_at_to: null,
    updated_at_from: null,
    updated_at_to: null,
    expired_at_from: null,
    expired_at_to: null,
    page: 1,
    limit: 10,
    sort: "created_at",
    sort_direction: "desc",
  };
  // Search without filters - should return empty initially
  const initialResults =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: searchBody,
      },
    );
  typia.assert(initialResults);
  // Validate empty results structure
  TestValidator.equals("initial results empty", initialResults.data.length, 0);
  TestValidator.equals(
    "pagination current page",
    initialResults.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", initialResults.pagination.limit, 10);
  TestValidator.equals(
    "total records zero",
    initialResults.pagination.records,
    0,
  );
  TestValidator.equals("total pages zero", initialResults.pagination.pages, 0);
  // Test various filter combinations with empty results
  const deleteActions =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          ...searchBody,
          action_type: "delete",
        },
      },
    );
  typia.assert(deleteActions);
  TestValidator.equals("delete actions empty", deleteActions.data.length, 0);
  const activeStatus =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          ...searchBody,
          status: "active",
        },
      },
    );
  typia.assert(activeStatus);
  TestValidator.equals("active status empty", activeStatus.data.length, 0);
  // Test moderator-specific filter
  const moderator1Actions =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          ...searchBody,
          moderator_id: moderator1.id,
        },
      },
    );
  typia.assert(moderator1Actions);
  TestValidator.equals(
    "moderator1 actions empty",
    moderator1Actions.data.length,
    0,
  );
  // Test date range filters
  const dateFiltered =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          ...searchBody,
          created_at_from: new Date(Date.now() - 86400000).toISOString(),
          created_at_to: new Date().toISOString(),
        },
      },
    );
  typia.assert(dateFiltered);
  TestValidator.equals("date filtered empty", dateFiltered.data.length, 0);
  // Test pagination with empty results
  const page1 =
    await api.functional.communityPlatform.moderator.posts.comments.moderations.index(
      moderator1Connection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          ...searchBody,
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(page1);
  TestValidator.equals("page1 empty", page1.data.length, 0);
  // Validate response structure
  TestValidator.predicate(
    "has pagination data",
    page1.pagination !== undefined,
  );
  TestValidator.predicate("has data array", Array.isArray(page1.data));
  TestValidator.equals(
    "pagination fields present",
    Object.keys(page1.pagination),
    ["current", "limit", "records", "pages"],
  );
}
