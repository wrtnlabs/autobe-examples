import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test viewing a user's post history when they have created multiple posts across different communities.
 *
 * This test verifies:
 * 1. Creating a member account
 * 2. Creating multiple communities as the member
 * 3. Creating multiple posts across different communities
 * 4. Viewing the user's post history via public endpoint
 * 5. Validating post summaries contain correct data
 * 6. Verifying posts are sorted by created_at descending
 * 7. Confirming pagination metadata is accurate
 */
export async function test_api_user_post_history_view_multiple_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account (target user whose posts will be viewed)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(2),
      bio: null,
      avatar_uri: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCloneMember.IJoin,
  });
  typia.assert(member);
  const targetUsername = member.username;
  // 2. Create 3 communities as the member (auto-subscribed as owner)
  const community1 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community1);
  const community2 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community2);
  const community3 =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon: null,
        },
      },
    );
  typia.assert(community3);
  // 3. Create multiple posts by the member in different communities
  // Create post 1 in community 1
  const post1 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community1.id,
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post1);
  // Wait a bit to ensure different timestamps
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Create post 2 in community 2
  const post2 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "link",
        communityId: community2.id,
        content: null,
      },
    },
  );
  typia.assert(post2);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Create post 3 in community 3
  const post3 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community3.id,
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post3);
  await new Promise((resolve) => setTimeout(resolve, 10));
  // Create post 4 in community 1 again
  const post4 = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        communityId: community1.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post4);
  // 4. View user's post history via public endpoint (no auth required)
  const publicConnection: api.IConnection = { host: connection.host };
  const postHistory = await api.functional.redditClone.users.posts.list(
    publicConnection,
    {
      username: targetUsername,
    },
  );
  typia.assert(postHistory);
  // 5. Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    postHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records count",
    postHistory.pagination.records,
    4,
  );
  TestValidator.predicate(
    "pagination has correct pages",
    postHistory.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "data array has correct length",
    postHistory.data.length === postHistory.pagination.records,
  );
  // 6. Verify all posts belong to the target user
  await ArrayUtil.asyncForEach(postHistory.data, async (postSummary, index) => {
    typia.assert(postSummary);
    // Verify author matches target user
    TestValidator.equals(
      `post ${index + 1} author username matches`,
      postSummary.author.username,
      targetUsername,
    );
    TestValidator.equals(
      `post ${index + 1} author id matches`,
      postSummary.author.id,
      member.id,
    );
    // Verify post has required fields
    TestValidator.predicate(
      `post ${index + 1} has valid id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postSummary.id,
      ),
    );
    TestValidator.predicate(
      `post ${index + 1} has valid title`,
      postSummary.title.length >= 1 && postSummary.title.length <= 500,
    );
    TestValidator.predicate(
      `post ${index + 1} has valid post_type`,
      ["text", "link", "image"].includes(postSummary.post_type),
    );
    TestValidator.predicate(
      `post ${index + 1} has valid score`,
      typeof postSummary.score === "number",
    );
    TestValidator.predicate(
      `post ${index + 1} has valid comment_count`,
      typeof postSummary.comment_count === "number" &&
        postSummary.comment_count >= 0,
    );
    TestValidator.predicate(
      `post ${index + 1} has valid created_at`,
      !isNaN(Date.parse(postSummary.created_at)),
    );
    // Verify community information is present
    TestValidator.predicate(
      `post ${index + 1} has community id`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        postSummary.community.id,
      ),
    );
    TestValidator.predicate(
      `post ${index + 1} has community name`,
      postSummary.community.name.length >= 3 &&
        postSummary.community.name.length <= 50,
    );
  });
  // 7. Verify posts are sorted by created_at descending (newest first)
  TestValidator.predicate(
    "posts sorted by created_at descending",
    (() => {
      for (let i = 0; i < postHistory.data.length - 1; i++) {
        const current = new Date(postHistory.data[i].created_at).getTime();
        const next = new Date(postHistory.data[i + 1].created_at).getTime();
        if (current < next) return false;
      }
      return true;
    })(),
  );
  // 8. Verify the most recent post (post4) is first
  TestValidator.equals(
    "most recent post is first",
    postHistory.data[0].id,
    post4.id,
  );
  // 9. Verify all created posts are present
  const returnedPostIds = postHistory.data.map((p) => p.id);
  TestValidator.predicate(
    "post1 is in results",
    returnedPostIds.includes(post1.id),
  );
  TestValidator.predicate(
    "post2 is in results",
    returnedPostIds.includes(post2.id),
  );
  TestValidator.predicate(
    "post3 is in results",
    returnedPostIds.includes(post3.id),
  );
  TestValidator.predicate(
    "post4 is in results",
    returnedPostIds.includes(post4.id),
  );
  // 10. Verify post types are correct
  const postTypeMap = new Map<string, string>([
    [post1.id, "text"],
    [post2.id, "link"],
    [post3.id, "text"],
    [post4.id, "text"],
  ]);
  await ArrayUtil.asyncForEach(postHistory.data, async (postSummary) => {
    const expectedType = postTypeMap.get(postSummary.id);
    if (expectedType) {
      TestValidator.equals(
        `post ${postSummary.id} has correct type`,
        postSummary.post_type,
        expectedType,
      );
    }
  });
}
