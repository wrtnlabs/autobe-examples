import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityFeedCache } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFeedCache";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_feed_viewing(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Hot sort (default)
  const hotFeed = await api.functional.redditCommunity.communities.feed.index(
    connection,
    {
      communityId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 20,
        sortType: "hot",
      } satisfies IRedditCommunityFeedCache.IRequest,
    },
  );
  typia.assert(hotFeed);
  // Validate pagination structure
  TestValidator.equals(
    "hot feed pagination has correct structure",
    hotFeed.pagination,
    {
      current: 1,
      limit: 20,
      records: hotFeed.pagination.records,
      pages: hotFeed.pagination.pages,
    },
  );
  TestValidator.predicate("hot feed has data", hotFeed.data.length > 0);
  // Validate each post structure
  for (const post of hotFeed.data) {
    TestValidator.equals(
      "post has valid UUID",
      true,
      /^[0-9a-f-]{36}$/i.test(post.id),
    );
    TestValidator.equals("post has title", true, post.title.length > 0);
    TestValidator.equals(
      "post has author username",
      true,
      post.author.username.length > 0,
    );
    TestValidator.equals(
      "post has community name",
      true,
      post.community.name.length > 0,
    );
    TestValidator.predicate(
      "post has valid vote score",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "post has valid comment count",
      typeof post.comment_count === "number",
    );
    TestValidator.equals(
      "post has valid datetime",
      post.created_at,
      post.created_at,
    );
    TestValidator.equals("post has valid type", post.post_type, post.post_type);
  }
  // Test 2: New sort
  const newFeed = await api.functional.redditCommunity.communities.feed.index(
    connection,
    {
      communityId:
        hotFeed.data[0]?.community.id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 20,
        sortType: "new",
      } satisfies IRedditCommunityFeedCache.IRequest,
    },
  );
  typia.assert(newFeed);
  // Verify new sort order (newest first)
  if (newFeed.data.length >= 2) {
    const prevCreated = new Date(newFeed.data[0].created_at).getTime();
    const nextCreated = new Date(newFeed.data[1].created_at).getTime();
    TestValidator.predicate(
      "new sort is descending by created_at",
      prevCreated >= nextCreated,
    );
  }
  // Test 3: Top sort (all time)
  const topFeed = await api.functional.redditCommunity.communities.feed.index(
    connection,
    {
      communityId:
        newFeed.data[0]?.community.id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 20,
        sortType: "top",
        timeFilter: "all",
      } satisfies IRedditCommunityFeedCache.IRequest,
    },
  );
  typia.assert(topFeed);
  // Verify top sort order (highest vote score first)
  if (topFeed.data.length >= 2) {
    const prevScore = topFeed.data[0].vote_score;
    const nextScore = topFeed.data[1].vote_score;
    TestValidator.predicate(
      "top sort is descending by vote_score",
      prevScore >= nextScore,
    );
  }
  // Test 4: Controversial sort
  const controversialFeed =
    await api.functional.redditCommunity.communities.feed.index(connection, {
      communityId:
        topFeed.data[0]?.community.id ??
        typia.random<string & tags.Format<"uuid">>(),
      body: {
        page: 1,
        limit: 20,
        sortType: "controversial",
      } satisfies IRedditCommunityFeedCache.IRequest,
    });
  typia.assert(controversialFeed);
  // Verify controversial sort (by absolute vote score)
  if (controversialFeed.data.length >= 2) {
    const prevAbsScore = Math.abs(controversialFeed.data[0].vote_score);
    const nextAbsScore = Math.abs(controversialFeed.data[1].vote_score);
    TestValidator.predicate(
      "controversial sort by absolute vote score",
      prevAbsScore >= nextAbsScore,
    );
  }
  // Test 5: Verify preview_content for different post types
  const textPost = hotFeed.data.find((p) => p.post_type === "text");
  const linkPost = hotFeed.data.find((p) => p.post_type === "link");
  const imagePost = hotFeed.data.find((p) => p.post_type === "image");
  if (textPost) {
    TestValidator.predicate(
      "text post has preview content",
      textPost.preview_content !== null,
    );
  }
  if (linkPost) {
    TestValidator.predicate(
      "link post has preview content",
      linkPost.preview_content !== null,
    );
  }
  if (imagePost) {
    TestValidator.predicate(
      "image post has preview content",
      imagePost.preview_content !== null,
    );
  }
  // Test 6: Verify pagination metadata consistency
  TestValidator.equals(
    "pagination records matches data length",
    hotFeed.pagination.records,
    hotFeed.data.length,
  );
  TestValidator.equals(
    "pagination pages calculation correct",
    hotFeed.pagination.pages,
    Math.ceil(hotFeed.pagination.records / hotFeed.pagination.limit),
  );
  // Test 7: Verify author and community references are complete
  const samplePost = hotFeed.data[0];
  if (samplePost) {
    TestValidator.equals("author has id", true, samplePost.author.id !== undefined);
    TestValidator.equals(
      "author has username",
      true,
      samplePost.author.username !== undefined,
    );
    TestValidator.equals(
      "community has id",
      true,
      samplePost.community.id !== undefined,
    );
    TestValidator.equals(
      "community has name",
      true,
      samplePost.community.name !== undefined,
    );
    TestValidator.equals(
      "community has owner",
      true,
      samplePost.community.owner !== undefined,
    );
  }
  // Test 8: Test page boundary
  const maxPage = hotFeed.pagination.pages;
  if (maxPage >= 2) {
    const secondPageFeed =
      await api.functional.redditCommunity.communities.feed.index(connection, {
        communityId:
          hotFeed.data[0]?.community.id ??
          typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 2,
          limit: 20,
          sortType: "hot",
        } satisfies IRedditCommunityFeedCache.IRequest,
      });
    typia.assert(secondPageFeed);
    TestValidator.equals(
      "second page has correct current page",
      secondPageFeed.pagination.current,
      2,
    );
  }
}