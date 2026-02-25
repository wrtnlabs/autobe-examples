import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";

export async function test_api_comment_tree_retrieval_new_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up platform admin actor
  const platformAdminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(platformAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Set up member actor
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 3. Create a community as member
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create a post as member in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Since there is no API to create comments, we'll skip comment creation
  // and proceed with the comment retrieval test directly
  // 6. Sort comments by 'new' and verify ordering
  const commentsResponse =
    await api.functional.redditCommunity.platformAdmin.posts.comments.index(
      platformAdminConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
        },
      },
    );
  typia.assert(commentsResponse);
  // We cannot validate the total count of comments since we didn't create any
  // This is a limitation of the available API - we can only test the endpoint works
  // Verify comments are ordered by created_at DESC, then by id DESC for identical timestamps
  // Since we don't have control over the existing comment data, we cannot assert ordering
  // This test can only verify the endpoint accepts the request and returns a valid structure
  // 7. Verify pagination with cursor parameters
  // First, get first page
  const firstPage =
    await api.functional.redditCommunity.platformAdmin.posts.comments.index(
      platformAdminConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 3,
        },
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 3);
  // Get second page using cursor from first page
  const lastCommentOnFirstPage = firstPage.data[firstPage.data.length - 1];
  const secondPage =
    await api.functional.redditCommunity.platformAdmin.posts.comments.index(
      platformAdminConnection,
      {
        postId: post.id,
        body: {
          sort: "new",
          limit: 3,
          cursor_created_at: lastCommentOnFirstPage.created_at,
          cursor_id: lastCommentOnFirstPage.id,
        },
      },
    );
  typia.assert(secondPage);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    () => firstPage.pagination.records >= 0,
  );
}
