import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImageContent";
import type { IRedditCommunityPostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostLinkContent";
import type { IRedditCommunityPostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostTextContent";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_member_subscriptions_create";
import { generate_random_reddit_community_posts_create } from "../../../generate/generate_random_reddit_community_posts_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

/**
 * Test pagination functionality when retrieving a member's posts.
 *
 * Validates the complete pagination flow for the member posts endpoint including post creation, pagination metadata verification, and multi-page navigation. Ensures that posts are correctly sorted by created_at DESC and that pagination metadata accurately reflects the total record count, page count, and current page position.
 *
 * The test creates a member account, establishes a community, subscribes the member to the community, and creates multiple posts exceeding the default page limit. It then verifies that the pagination response contains correct metadata and that posts are returned in the expected order across multiple pages.
 *
 * 1. Member registers with unique credentials via authorize_member_join.
 * 2. Member creates a community for posting.
 * 3. Member subscribes to the created community (required for post creation).
 * 4. Create 15 posts by the member to exceed typical page limit of 10.
 * 5. Fetch first page of posts and validate pagination metadata.
 * 6. Verify posts are sorted by created_at DESC (newest first).
 * 7. Fetch second page and validate correct subset of posts.
 * 8. Test edge case: create new member with zero posts and verify empty response.
 */
export async function test_api_member_post_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe member to community
  const subscription =
    await generate_random_reddit_community_member_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        } satisfies IRedditCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create 15 posts to exceed page limit
  const postCount = 15;
  const createdPosts: IRedditCommunityPost[] = [];
  for (let i = 0; i < postCount; i++) {
    const post = await generate_random_reddit_community_posts_create(
      memberConnection,
      {
        body: {
          title: `Test Post ${i + 1}`,
          post_type: "text",
          community_id: community.id,
          body: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    createdPosts.push(post);
    // Small delay to ensure distinct created_at timestamps
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  // 5. Fetch first page and validate pagination metadata
  const firstPage =
    await api.functional.redditCommunity.member.members.posts.iterate(
      memberConnection,
      {
        username: memberAuth.username,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.predicate(
    "first page limit valid",
    firstPage.pagination.limit > 0,
  );
  TestValidator.equals(
    "total records",
    firstPage.pagination.records,
    postCount,
  );
  TestValidator.predicate(
    "total pages calculated",
    firstPage.pagination.pages > 1,
  );
  TestValidator.equals(
    "pages formula",
    firstPage.pagination.pages,
    Math.ceil(postCount / firstPage.pagination.limit),
  );
  // 6. Verify posts are sorted by created_at DESC
  TestValidator.predicate("first page has posts", firstPage.data.length > 0);
  TestValidator.predicate("posts sorted DESC", () => {
    for (let i = 1; i < firstPage.data.length; i++) {
      if (
        new Date(firstPage.data[i].created_at).getTime() >
        new Date(firstPage.data[i - 1].created_at).getTime()
      ) {
        return false;
      }
    }
    return true;
  });
  // 7. Verify first page contains most recent posts
  const sortedPosts = [...createdPosts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  TestValidator.equals(
    "first post matches newest",
    firstPage.data[0].id,
    sortedPosts[0].id,
  );
  // 8. Fetch second page if exists
  if (firstPage.pagination.pages >= 2) {
    const secondPage =
      await api.functional.redditCommunity.member.members.posts.iterate(
        memberConnection,
        {
          username: memberAuth.username,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      firstPage.pagination.limit,
    );
    TestValidator.equals(
      "second page records",
      secondPage.pagination.records,
      postCount,
    );
    TestValidator.predicate(
      "second page has posts",
      secondPage.data.length > 0,
    );
    // Verify no overlap between pages
    const firstPageIds = new Set(firstPage.data.map((p) => p.id));
    const secondPageIds = new Set(secondPage.data.map((p) => p.id));
    TestValidator.predicate("no duplicate posts across pages", () => {
      for (const id of firstPageIds) {
        if (secondPageIds.has(id)) {
          return false;
        }
      }
      return true;
    });
  }
  // 9. Test edge case: member with zero posts
  const emptyMemberConnection: api.IConnection = { host: connection.host };
  const emptyMemberAuth = await authorize_member_join(emptyMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(emptyMemberAuth);
  const emptyPosts =
    await api.functional.redditCommunity.member.members.posts.iterate(
      emptyMemberConnection,
      {
        username: emptyMemberAuth.username,
      },
    );
  typia.assert(emptyPosts);
  TestValidator.equals("zero posts records", emptyPosts.pagination.records, 0);
  TestValidator.equals("zero posts pages", emptyPosts.pagination.pages, 0);
  TestValidator.equals("zero posts current", emptyPosts.pagination.current, 1);
  TestValidator.equals("zero posts data empty", emptyPosts.data.length, 0);
}
