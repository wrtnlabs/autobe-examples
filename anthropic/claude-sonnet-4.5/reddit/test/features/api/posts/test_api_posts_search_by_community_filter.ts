import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Test filtering posts by specific community ID.
 *
 * This test validates that the post search API correctly filters posts by
 * community_id. It creates two separate communities, populates them with posts,
 * then verifies that searching with a community_id filter returns only posts
 * from that specific community and excludes posts from other communities.
 *
 * Test flow:
 *
 * 1. Create moderator account
 * 2. Create two communities (A and B)
 * 3. Create member account
 * 4. Create multiple posts in community A
 * 5. Create posts in community B
 * 6. Search posts filtered by community A's ID
 * 7. Verify only community A posts are returned
 * 8. Verify community B posts are excluded
 */
export async function test_api_posts_search_by_community_filter(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: "moderator123",
      nickname: RandomGenerator.name(),
      ip: null,
      href: "https://test.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create first community (Community A)
  const communityAName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityA =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityAName satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityA);

  // Step 3: Create second community (Community B)
  const communityBName = RandomGenerator.alphaNumeric(10).toLowerCase();
  const communityB =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: communityBName satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.paragraph({
            sentences: 2,
          }) satisfies string & tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 5,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 3 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(communityB);

  // Step 4: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8) satisfies string &
        tags.MinLength<3> &
        tags.MaxLength<50>,
      email: memberEmail,
      password: "member123" satisfies string & tags.MinLength<8>,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: "https://test.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "" satisfies string & tags.Format<"uri">,
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 5: Create multiple posts in Community A
  const communityAPostIds: string[] = [];

  // Create text post in Community A
  const textPostA = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 3 }) satisfies string &
          tags.MaxLength<40000>,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPostA);
  communityAPostIds.push(textPostA.id);

  // Create link post in Community A
  const linkPostA = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "link",
        body: null,
        url: typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>(),
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPostA);
  communityAPostIds.push(linkPostA.id);

  // Create image post in Community A
  const imagePostA = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityA.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "image",
        body: null,
        url: null,
        image_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(imagePostA);
  communityAPostIds.push(imagePostA.id);

  // Step 6: Create posts in Community B
  const communityBPostIds: string[] = [];

  // Create text post in Community B
  const textPostB = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }) satisfies string &
          tags.MaxLength<40000>,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPostB);
  communityBPostIds.push(textPostB.id);

  // Create link post in Community B
  const linkPostB = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: communityB.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "link",
        body: null,
        url: typia.random<string & tags.MaxLength<2000> & tags.Format<"uri">>(),
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPostB);
  communityBPostIds.push(linkPostB.id);

  // Step 7: Search posts filtered by Community A
  const searchResult = await api.functional.redditCommunity.posts.index(
    connection,
    {
      body: {
        page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 satisfies number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
        community_id: communityA.id,
      } satisfies IRedditCommunityPost.IRequest,
    },
  );
  typia.assert(searchResult);

  // Step 8: Validate results contain only Community A posts
  TestValidator.predicate(
    "search results should not be empty",
    searchResult.data.length > 0,
  );

  // Verify all returned posts belong to Community A
  for (const post of searchResult.data) {
    TestValidator.equals(
      "post community ID should match filter",
      post.community.id,
      communityA.id,
    );

    TestValidator.equals(
      "post community name should match Community A",
      post.community.name,
      communityA.name,
    );
  }

  // Step 9: Verify Community A posts are present in results
  const returnedPostIds = searchResult.data.map((p) => p.id);
  for (const expectedId of communityAPostIds) {
    TestValidator.predicate(
      "Community A post should be in search results",
      returnedPostIds.includes(expectedId),
    );
  }

  // Step 10: Verify Community B posts are NOT in results
  for (const communityBId of communityBPostIds) {
    TestValidator.predicate(
      "Community B post should NOT be in search results",
      !returnedPostIds.includes(communityBId),
    );
  }
}
