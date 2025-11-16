import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_comment_content_validation_minimum_length(
  connection: api.IConnection,
) {
  // Setup: Create administrator and category
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(10),
        password: "TestPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Setup: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph(),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Test 1: Create comment with single character 'a'
  const comment1: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: "a",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment1);
  TestValidator.equals(
    "comment with single character 'a' created successfully",
    comment1.content,
    "a",
  );

  // Test 2: Create comment with single digit '1'
  const comment2: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: "1",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment2);
  TestValidator.equals(
    "comment with single digit '1' created successfully",
    comment2.content,
    "1",
  );

  // Test 3: Create comment with special character '*'
  const comment3: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          content: "*",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment3);
  TestValidator.equals(
    "comment with special character '*' created successfully",
    comment3.content,
    "*",
  );

  // Test 4: Empty string should fail
  await TestValidator.error(
    "empty string comment should be rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            content: "",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // Test 5: Whitespace-only content should fail
  await TestValidator.error(
    "whitespace-only comment should be rejected",
    async () => {
      await api.functional.communityPlatform.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            content: "   ",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
