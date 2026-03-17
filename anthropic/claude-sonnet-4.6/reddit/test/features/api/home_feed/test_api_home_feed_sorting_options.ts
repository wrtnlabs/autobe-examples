import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_home_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // ────────────────────────────────────────────────────────────────────────────
  // 1. Register a member
  // ────────────────────────────────────────────────────────────────────────────
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // ────────────────────────────────────────────────────────────────────────────
  // 2. Create a community
  // ────────────────────────────────────────────────────────────────────────────
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // ────────────────────────────────────────────────────────────────────────────
  // 3. Subscribe to the community
  // ────────────────────────────────────────────────────────────────────────────
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // ────────────────────────────────────────────────────────────────────────────
  // 4. Create multiple posts (text, link, image)
  // ────────────────────────────────────────────────────────────────────────────
  const textPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "text",
          body: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(textPost);
  const linkPost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "link",
          url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(linkPost);
  const imagePost =
    await api.functional.community.member.communities.posts.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          type: "image",
          image_url: typia.random<string & tags.Format<"uri">>(),
          thumbnail_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(imagePost);
  // ────────────────────────────────────────────────────────────────────────────
  // Sort: new — posts ordered newest to oldest
  // ────────────────────────────────────────────────────────────────────────────
  const feedNew = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedNew);
  // Verify chronological order (newest first)
  for (let i = 0; i < feedNew.data.length - 1; i++) {
    const current = feedNew.data[i]!;
    const next = feedNew.data[i + 1]!;
    TestValidator.predicate(
      "new sort: posts ordered newest to oldest",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // ────────────────────────────────────────────────────────────────────────────
  // Sort: hot
  // ────────────────────────────────────────────────────────────────────────────
  const feedHot = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "hot",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedHot);
  TestValidator.predicate(
    "hot sort: valid pagination",
    feedHot.pagination.limit === 10,
  );
  // ────────────────────────────────────────────────────────────────────────────
  // Sort: top with timeRange 'this_week'
  // ────────────────────────────────────────────────────────────────────────────
  const feedTopWeek = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "top",
        timeRange: "this_week",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedTopWeek);
  // Verify vote_score ordering (descending)
  for (let i = 0; i < feedTopWeek.data.length - 1; i++) {
    const current = feedTopWeek.data[i]!;
    const next = feedTopWeek.data[i + 1]!;
    TestValidator.predicate(
      "top sort: vote_score ordered descending",
      current.vote_score >= next.vote_score,
    );
  }
  // Verify all returned posts were created within the last 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  for (const post of feedTopWeek.data) {
    TestValidator.predicate(
      "top+this_week: post created within last 7 days",
      new Date(post.created_at).getTime() >= sevenDaysAgo.getTime(),
    );
  }
  // ────────────────────────────────────────────────────────────────────────────
  // Sort: top without timeRange
  // ────────────────────────────────────────────────────────────────────────────
  const feedTopDefault = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "top",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedTopDefault);
  // ────────────────────────────────────────────────────────────────────────────
  // Sort: controversial
  // ────────────────────────────────────────────────────────────────────────────
  const feedControversial = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "controversial",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedControversial);
  // ────────────────────────────────────────────────────────────────────────────
  // Pagination validation: limit=2
  // ────────────────────────────────────────────────────────────────────────────
  const feedPage1 = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        sort: "new",
        page: 1,
        limit: 2,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedPage1);
  TestValidator.equals("pagination limit", feedPage1.pagination.limit, 2);
  TestValidator.equals(
    "pagination current page",
    feedPage1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination data length <= 2",
    feedPage1.data.length <= 2,
  );
  // If there are more pages, verify page 2 has different posts
  if (feedPage1.pagination.pages > 1) {
    const feedPage2 = await api.functional.community.member.feed.index(
      memberConnection,
      {
        body: {
          sort: "new",
          page: 2,
          limit: 2,
        } satisfies ICommunityPost.IRequest,
      },
    );
    typia.assert(feedPage2);
    TestValidator.equals("page 2 current", feedPage2.pagination.current, 2);
    TestValidator.predicate(
      "page 2 has different posts from page 1",
      feedPage2.data.every(
        (p2Post) => !feedPage1.data.some((p1Post) => p1Post.id === p2Post.id),
      ),
    );
  }
  // ────────────────────────────────────────────────────────────────────────────
  // Type filter: text
  // ────────────────────────────────────────────────────────────────────────────
  const feedText = await api.functional.community.member.feed.index(
    memberConnection,
    {
      body: {
        type: "text",
        page: 1,
        limit: 10,
      } satisfies ICommunityPost.IRequest,
    },
  );
  typia.assert(feedText);
  for (const post of feedText.data) {
    TestValidator.equals("type filter: post type is text", post.type, "text");
    TestValidator.predicate(
      "type filter: preview is ITextPreview",
      post.preview.type === "text",
    );
    if (post.preview.type === "text") {
      TestValidator.predicate(
        "text preview snippet length <= 200",
        post.preview.snippet.length <= 200,
      );
    }
  }
}
