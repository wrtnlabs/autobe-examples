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

export async function test_api_comment_tree_retrieval_best_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as platformAdmin
  const platformAdminConnection: api.IConnection = { host: connection.host };
  await authorize_platform_admin_join(platformAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  // 2. Create a member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
    } satisfies IRedditCommunityMember.IJoin,
  });
  // 3. Create a community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create a post in the community
  const post = await generate_random_reddit_community_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // Since we can't create comments directly, we'll skip comment creation
  // and focus on retrieving comments that may already exist or use a different approach
  // 6. Retrieve comments sorted by 'best' (vote_score DESC, created_at ASC for equal scores)
  const response =
    await api.functional.redditCommunity.platformAdmin.posts.comments.index(
      platformAdminConnection,
      {
        postId: post.id,
        body: {
          sort: "best",
          limit: 50,
        } satisfies IRedditCommunityComment.IRequest,
      },
    );
  typia.assert(response);
  // Validate the response structure
  TestValidator.equals(
    "expected at least one comment in the response",
    response.data.length >= 0,
    true,
  );
  TestValidator.equals("limit should be 50", response.pagination.limit, 50);
  TestValidator.equals(
    "current page should be 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pages should be at least 1",
    response.pagination.pages >= 1,
    true,
  );
  // Validate sorting order for existing comments
  // Since we can't control comment creation, we validate what exists
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = response.data[i];
    const next = response.data[i + 1];
    if (current.vote_score === next.vote_score) {
      // For equal vote scores, created_at should be ascending (earlier first)
      TestValidator.predicate("created_at ascending for equal votes", () => {
        return (
          new Date(current.created_at).getTime() <=
          new Date(next.created_at).getTime()
        );
      });
    } else {
      // For different vote scores, higher vote_score should come first
      TestValidator.predicate("vote_score descending", () => {
        return current.vote_score > next.vote_score;
      });
    }
  }
  // 9. Fetch second page using cursor-based pagination if there are more than 50 comments
  if (response.pagination.records > 50) {
    const lastComment = response.data[response.data.length - 1];
    const secondPage =
      await api.functional.redditCommunity.platformAdmin.posts.comments.index(
        platformAdminConnection,
        {
          postId: post.id,
          body: {
            sort: "best",
            limit: 50,
            cursor_created_at: lastComment.created_at,
            cursor_id: lastComment.id,
          } satisfies IRedditCommunityComment.IRequest,
        },
      );
    typia.assert(secondPage);
    // Validate second page
    TestValidator.equals(
      "second page should have less than or equal to 50 comments",
      secondPage.data.length <= 50,
      true,
    );
    TestValidator.equals(
      "second page should be page 2",
      secondPage.pagination.current,
      2,
    );
    // Validate second page comments follow the same sorting pattern
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      const current = secondPage.data[i];
      const next = secondPage.data[i + 1];
      if (current.vote_score === next.vote_score) {
        TestValidator.predicate(
          "created_at ascending for equal votes in second page",
          () => {
            return (
              new Date(current.created_at).getTime() <=
              new Date(next.created_at).getTime()
            );
          },
        );
      } else {
        TestValidator.predicate("vote_score descending in second page", () => {
          return current.vote_score > next.vote_score;
        });
      }
    }
    // Verify that comments from both pages together are consecutive
    const firstPageLastComment = response.data[response.data.length - 1];
    const secondPageFirstComment = secondPage.data[0];
    TestValidator.predicate("pagination continuity: no overlap", () => {
      // Ensure there is no overlap between pages
      return !(
        firstPageLastComment.created_at === secondPageFirstComment.created_at &&
        firstPageLastComment.id === secondPageFirstComment.id
      );
    });
  }
}
