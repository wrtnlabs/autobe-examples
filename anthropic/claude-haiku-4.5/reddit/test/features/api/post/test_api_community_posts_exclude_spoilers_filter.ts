import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_exclude_spoilers_filter(
  connection: api.IConnection,
) {
  // 1. Set up administrator and create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "Admin@123456";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create category as administrator
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member@123456";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphabets(8),
      href: "http://localhost:3000",
      referrer: "",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 3. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(6)}`,
          description: "Community for sharing technology news and discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 4. Create posts with and without spoilers
  const postsWithSpoilers = await ArrayUtil.asyncRepeat(3, async () =>
    api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Movie Review - ${RandomGenerator.name()}`,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        has_spoiler: true,
      } satisfies ICommunityPlatformPost.ICreate,
    }),
  );
  typia.assert(postsWithSpoilers);

  const postsWithoutSpoilers = await ArrayUtil.asyncRepeat(3, async () =>
    api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: `Tech Tips - ${RandomGenerator.name()}`,
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    }),
  );
  typia.assert(postsWithoutSpoilers);

  // 5. Test exclude_spoilers=true (should filter out spoiler posts)
  const resultWithSpoilersExcluded =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(resultWithSpoilersExcluded);

  TestValidator.predicate(
    "exclude_spoilers=true should not include spoiler posts",
    !resultWithSpoilersExcluded.data.some((post) => post.has_spoiler === true),
  );

  TestValidator.equals(
    "exclude_spoilers=true should return only non-spoiler posts",
    resultWithSpoilersExcluded.data.length,
    3,
  );

  // 6. Test exclude_spoilers=false (should include all posts)
  const resultWithSpoilersIncluded =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        exclude_spoilers: false,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(resultWithSpoilersIncluded);

  TestValidator.equals(
    "exclude_spoilers=false should return all posts",
    resultWithSpoilersIncluded.data.length,
    6,
  );

  TestValidator.predicate(
    "exclude_spoilers=false should include both spoiler and non-spoiler posts",
    resultWithSpoilersIncluded.data.some((post) => post.has_spoiler === true) &&
      resultWithSpoilersIncluded.data.some(
        (post) => post.has_spoiler === false,
      ),
  );

  // 7. Test default behavior (exclude_spoilers omitted, should include all)
  const resultDefault =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(resultDefault);

  TestValidator.equals(
    "default behavior should return all posts when exclude_spoilers is not specified",
    resultDefault.data.length,
    6,
  );

  // 8. Test combination with other filters
  const textOnlyNonSpoiler =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        post_type: "text",
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(textOnlyNonSpoiler);

  TestValidator.predicate(
    "combined filter should return only text posts without spoilers",
    textOnlyNonSpoiler.data.every(
      (post) => post.post_type === "text" && post.has_spoiler === false,
    ),
  );

  // 9. Test pagination with spoiler filtering
  const page1 = await api.functional.communityPlatform.communities.posts.index(
    connection,
    {
      communityId: community.id,
      body: {
        page: 1,
        limit: 2,
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page1);

  TestValidator.equals(
    "pagination with spoiler filter should respect limit",
    page1.data.length,
    2,
  );

  TestValidator.predicate(
    "pagination should not include spoiler posts",
    !page1.data.some((post) => post.has_spoiler === true),
  );

  // 10. Test visibility status filtering with spoiler filtering
  const publicNonSpoiler =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        visibility_status: "public",
        exclude_spoilers: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(publicNonSpoiler);

  TestValidator.predicate(
    "should filter by visibility and spoilers",
    publicNonSpoiler.data.every(
      (post) =>
        post.visibility_status === "public" && post.has_spoiler === false,
    ),
  );
}
