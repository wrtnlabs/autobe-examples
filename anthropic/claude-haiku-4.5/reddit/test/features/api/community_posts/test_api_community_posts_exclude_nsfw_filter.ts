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

export async function test_api_community_posts_exclude_nsfw_filter(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "Technology and programming discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: memberPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create posts with different NSFW flags
  const nsfw_posts: ICommunityPlatformPost[] = [];
  const safe_posts: ICommunityPlatformPost[] = [];

  // Create 3 NSFW posts
  for (let i = 0; i < 3; i++) {
    const nsfw_post =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `NSFW Post ${i + 1}`,
          content_text: RandomGenerator.paragraph(),
          is_nsfw: true,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(nsfw_post);
    nsfw_posts.push(nsfw_post);
  }

  // Create 3 safe posts
  for (let i = 0; i < 3; i++) {
    const safe_post =
      await api.functional.communityPlatform.member.posts.create(connection, {
        body: {
          community_id: community.id,
          post_type: "text",
          title: `Safe Post ${i + 1}`,
          content_text: RandomGenerator.paragraph(),
          is_nsfw: false,
          has_spoiler: false,
        } satisfies ICommunityPlatformPost.ICreate,
      });
    typia.assert(safe_post);
    safe_posts.push(safe_post);
  }

  // Step 6: Test exclude_nsfw=true - should only return safe posts
  const response_exclude_nsfw =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        exclude_nsfw: true,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(response_exclude_nsfw);

  // Verify that only safe posts are returned
  TestValidator.predicate(
    "exclude_nsfw=true should filter out NSFW posts",
    response_exclude_nsfw.data.every((post) => post.is_nsfw === false),
  );

  TestValidator.equals(
    "exclude_nsfw=true should return only safe posts count",
    response_exclude_nsfw.data.length,
    safe_posts.length,
  );

  // Step 7: Test exclude_nsfw=false - should return both NSFW and safe posts
  const response_include_nsfw =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
        exclude_nsfw: false,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(response_include_nsfw);

  // Verify that both NSFW and safe posts are returned
  const has_nsfw_posts = response_include_nsfw.data.some(
    (post) => post.is_nsfw === true,
  );
  const has_safe_posts = response_include_nsfw.data.some(
    (post) => post.is_nsfw === false,
  );

  TestValidator.predicate(
    "exclude_nsfw=false should include NSFW posts",
    has_nsfw_posts,
  );

  TestValidator.predicate(
    "exclude_nsfw=false should include safe posts",
    has_safe_posts,
  );

  TestValidator.equals(
    "exclude_nsfw=false should return all posts",
    response_include_nsfw.data.length,
    nsfw_posts.length + safe_posts.length,
  );

  // Step 8: Test default behavior (no exclude_nsfw parameter) - should return both types
  const response_default =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 100,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(response_default);

  // Verify that both NSFW and safe posts are returned by default
  const default_has_nsfw = response_default.data.some(
    (post) => post.is_nsfw === true,
  );
  const default_has_safe = response_default.data.some(
    (post) => post.is_nsfw === false,
  );

  TestValidator.predicate(
    "default behavior should include NSFW posts",
    default_has_nsfw,
  );

  TestValidator.predicate(
    "default behavior should include safe posts",
    default_has_safe,
  );

  // Step 9: Verify pagination information
  TestValidator.predicate(
    "pagination should have correct page number",
    response_exclude_nsfw.pagination.current === 1,
  );

  TestValidator.predicate(
    "pagination should have limit of 100",
    response_exclude_nsfw.pagination.limit === 100,
  );

  TestValidator.predicate(
    "pagination records should match returned data count",
    response_exclude_nsfw.pagination.records >=
      response_exclude_nsfw.data.length,
  );
}
