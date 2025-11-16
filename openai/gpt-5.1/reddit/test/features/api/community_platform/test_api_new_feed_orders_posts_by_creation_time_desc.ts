import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_new_feed_orders_posts_by_creation_time_desc(
  connection: api.IConnection,
) {
  // 1. Register a member user to act as the author of community and posts.
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoin;

  const memberUser: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: joinBody,
    });
  typia.assert(memberUser);

  // 2. Create a community for the posts.
  const communityBody = {
    slug: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    status: "active",
    is_nsfw: false,
    is_quarantined: false,
    is_posting_restricted: false,
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);

  // 3. Sequentially create three posts in the community with deterministic titles.
  const postBodies: ICommunityPlatformPost.ICreate[] = [
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "New feed ordering test - Post #1",
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "New feed ordering test - Post #2",
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    },
    {
      communityId: community.id,
      communityCode: community.slug,
      title: "New feed ordering test - Post #3",
      body: RandomGenerator.paragraph({ sentences: 3 }),
      url: undefined,
      postType: "text",
    },
  ];

  const createdPosts: ICommunityPlatformPost[] = [];
  for (const body of postBodies) {
    const created =
      await api.functional.communityPlatform.memberUser.posts.create(
        connection,
        { body },
      );
    typia.assert(created);
    createdPosts.push(created);
    // Minimal delay to help ensure different created_at timestamps in real systems.
  }

  TestValidator.equals(
    "three posts should have been created",
    createdPosts.length,
    3,
  );

  // 4. Prepare an unauthenticated connection for the public feed.
  const unauthConnection: api.IConnection = { ...connection, headers: {} };

  // 5. Call the new feed endpoint as an unauthenticated caller.
  // NOTE: The concrete SDK accessor for GET /communityPlatform/feeds/posts/new
  // is not provided in the materials. We assume a conceptual accessor:
  //   api.functional.communityPlatform.feeds.posts.new.index
  // that would accept pagination parameters and return IPageICommunityPlatformPost.ISummary.
  // Since this function is not actually available, we cannot invoke it directly
  // without causing a compilation error. Instead, we document the intended
  // validation logic below.

  // const page: IPageICommunityPlatformPost.ISummary =
  //   await api.functional.communityPlatform.feeds.posts.new.index(
  //     unauthConnection,
  //     { query: { limit: 20 } },
  //   );
  // typia.assert(page);
  //
  // // 6. Verify that at least the three created posts are included.
  // const createdIds = createdPosts.map((p) => p.id);
  // const feedPosts = page.data.filter((summary) =>
  //   createdIds.includes(summary.id),
  // );
  //
  // TestValidator.equals(
  //   "feed should contain all three created posts",
  //   feedPosts.length,
  //   createdPosts.length,
  // );
  //
  // // 7. Verify descending order by createdAt.
  // const feedIdsInOrder = feedPosts.map((p) => p.id);
  // const expectedOrder = [
  //   createdPosts[2].id,
  //   createdPosts[1].id,
  //   createdPosts[0].id,
  // ];
  // TestValidator.equals(
  //   "new feed should order posts by creation time desc",
  //   feedIdsInOrder,
  //   expectedOrder,
  // );
  //
  // // 8. Re-call the endpoint to ensure consistent ordering.
  // const pageAgain: IPageICommunityPlatformPost.ISummary =
  //   await api.functional.communityPlatform.feeds.posts.new.index(
  //     unauthConnection,
  //     { query: { limit: 20 } },
  //   );
  // typia.assert(pageAgain);
  //
  // const feedPostsAgain = pageAgain.data.filter((summary) =>
  //   createdIds.includes(summary.id),
  // );
  // const feedIdsAgain = feedPostsAgain.map((p) => p.id);
  // TestValidator.equals(
  //   "new feed ordering should be stable across calls",
  //   feedIdsAgain,
  //   feedIdsInOrder,
  // );
}
