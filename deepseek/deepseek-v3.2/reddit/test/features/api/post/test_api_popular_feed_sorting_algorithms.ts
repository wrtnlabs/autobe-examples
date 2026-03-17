import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_popular_feed_sorting_algorithms(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up multiple member accounts
  const memberConnections: api.IConnection[] = ArrayUtil.repeat(5, (i) => ({
    host: connection.host,
  }));
  const members: ICommunityPlatformMember.IAuthorized[] = [];
  for (const memberConn of memberConnections) {
    const member = await authorize_member_join(memberConn, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        username: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(member);
    members.push(member);
  }
  // 2. Create multiple communities
  const communities: ICommunityPlatformCommunity[] = [];
  for (const member of members.slice(0, 3)) {
    const communityConn: api.IConnection = {
      host: connection.host,
      headers: memberConnections[0].headers,
    };
    const community =
      await generate_random_community_platform_member_communities_create(
        communityConn,
        {},
      );
    typia.assert(community);
    communities.push(community);
  }
  // 3. Create posts with varied vote scores and creation times
  const posts: ICommunityPlatformPost[] = [];
  const postVotes: ICommunityPlatformPostVote[] = [];
  // Create 20 posts across different communities with varied timestamps
  for (let i = 0; i < 20; i++) {
    const authorIndex = i % members.length;
    const communityIndex = i % communities.length;
    const authorConn = memberConnections[authorIndex];
    const post = await generate_random_community_platform_member_posts_create(
      authorConn,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: communities[communityIndex].name,
          content_type: "TEXT" as const,
          content_text: {
            content: RandomGenerator.paragraph({ sentences: 3 }),
            formatting: "plain",
          },
        },
      },
    );
    typia.assert(post);
    posts.push(post);
    // Add votes to create varied scores
    const voterCount = typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0> & tags.Maximum<5>
    >();
    for (let v = 0; v < voterCount; v++) {
      const voterIndex = (authorIndex + v + 1) % members.length;
      const voterConn = memberConnections[voterIndex];
      const vote =
        await generate_random_community_platform_member_posts_votes_create(
          voterConn,
          {
            params: { postId: post.id },
            body: { type: RandomGenerator.pick(["up", "down"] as const) },
          },
        );
      typia.assert(vote);
      postVotes.push(vote);
    }
  }
  // 4. Test HOT sorting (recent posts with high engagement)
  const hotResponse = await api.functional.communityPlatform.popular_feed.index(
    { host: connection.host }, // Base connection for public feed
    {
      body: {
        sort: "hot",
        top_time_range: null,
        community_id: null,
        author_id: null,
        content_type: null,
        created_at_start: null,
        created_at_end: null,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(hotResponse);
  TestValidator.equals(
    "hot response has data",
    hotResponse.data.length > 0,
    true,
  );
  TestValidator.predicate(
    "hot response has pagination",
    () =>
      hotResponse.pagination.current === 1 &&
      hotResponse.pagination.limit === 10,
  );
  // 5. Test NEW sorting (most recent first)
  const newResponse = await api.functional.communityPlatform.popular_feed.index(
    { host: connection.host },
    {
      body: {
        sort: "new",
        top_time_range: null,
        community_id: null,
        author_id: null,
        content_type: null,
        created_at_start: null,
        created_at_end: null,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(newResponse);
  TestValidator.equals(
    "new response has data",
    newResponse.data.length > 0,
    true,
  );
  // Verify NEW sorting returns posts in descending created_at order
  if (newResponse.data.length > 1) {
    for (let i = 0; i < newResponse.data.length - 1; i++) {
      const current = new Date(newResponse.data[i].created_at);
      const next = new Date(newResponse.data[i + 1].created_at);
      TestValidator.predicate(`new sorting order item ${i}`, current >= next);
    }
  }
  // 6. Test TOP sorting with different time filters
  const topTimeFilters = ["today", "week", "month", "year", "all"] as const;
  for (const timeFilter of topTimeFilters) {
    const topResponse =
      await api.functional.communityPlatform.popular_feed.index(
        { host: connection.host },
        {
          body: {
            sort: "top",
            top_time_range: timeFilter,
            community_id: null,
            author_id: null,
            content_type: null,
            created_at_start: null,
            created_at_end: null,
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(topResponse);
    TestValidator.equals(
      `${timeFilter} top response has data`,
      topResponse.data.length > 0,
      true,
    );
    // Verify TOP sorting returns posts in descending vote_score order
    if (topResponse.data.length > 1) {
      for (let i = 0; i < topResponse.data.length - 1; i++) {
        TestValidator.predicate(
          `${timeFilter} top sorting order item ${i}`,
          topResponse.data[i].vote_score >= topResponse.data[i + 1].vote_score,
        );
      }
    }
  }
  // 7. Test CONTROVERSIAL sorting (many votes but score close to zero)
  const controversialResponse =
    await api.functional.communityPlatform.popular_feed.index(
      { host: connection.host },
      {
        body: {
          sort: "controversial",
          top_time_range: null,
          community_id: null,
          author_id: null,
          content_type: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(controversialResponse);
  TestValidator.equals(
    "controversial response has data",
    controversialResponse.data.length > 0,
    true,
  );
  // 8. Test pagination across sorting modes
  const sortingModes = ["hot", "new", "top", "controversial"] as const;
  for (const sortMode of sortingModes) {
    const page1 = await api.functional.communityPlatform.popular_feed.index(
      { host: connection.host },
      {
        body: {
          sort: sortMode,
          top_time_range: sortMode === "top" ? "all" : null,
          community_id: null,
          author_id: null,
          content_type: null,
          created_at_start: null,
          created_at_end: null,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(page1);
    const page2 = await api.functional.communityPlatform.popular_feed.index(
      { host: connection.host },
      {
        body: {
          sort: sortMode,
          top_time_range: sortMode === "top" ? "all" : null,
          community_id: null,
          author_id: null,
          content_type: null,
          created_at_start: null,
          created_at_end: null,
          page: 2,
          limit: 5,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
    typia.assert(page2);
    // Verify pagination works (different pages should have different posts)
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = new Set(page1.data.map((p) => p.id));
      const page2Ids = new Set(page2.data.map((p) => p.id));
      // Check no overlap between pages (should be different posts)
      for (const id of page1Ids) {
        TestValidator.equals(
          `${sortMode} pagination no overlap`,
          page2Ids.has(id),
          false,
        );
      }
    }
  }
}
