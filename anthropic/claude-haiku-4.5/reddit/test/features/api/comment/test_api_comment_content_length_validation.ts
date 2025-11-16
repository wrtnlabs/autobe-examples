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

export async function test_api_comment_content_length_validation(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.name(3),
        content_text: RandomGenerator.paragraph(),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Test minimum length (1 character) - should succeed
  const minComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "a",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(minComment);
  TestValidator.equals(
    "minimum length comment created",
    minComment.content,
    "a",
  );

  // 7. Test maximum length (10,000 characters) - should succeed
  const maxContent = RandomGenerator.alphabets(10000);
  const maxComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: maxContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum length comment created",
    maxComment.content.length,
    10000,
  );

  // 8. Test just under maximum (9,999 characters) - should succeed
  const almostMaxContent = RandomGenerator.alphabets(9999);
  const almostMaxComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: almostMaxContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(almostMaxComment);
  TestValidator.equals(
    "9999 character comment created",
    almostMaxComment.content.length,
    9999,
  );

  // 9. Test over maximum (10,001 characters) - should fail
  const overMaxContent = RandomGenerator.alphabets(10001);
  await TestValidator.error(
    "comment with 10,001 characters should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: overMaxContent,
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 10. Test empty content - should fail
  await TestValidator.error(
    "empty comment content should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: "",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 11. Test whitespace-only content - should fail
  await TestValidator.error(
    "whitespace-only comment should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.create(
        connection,
        {
          body: {
            post_id: post.id,
            content: "   \n\t   ",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );
}
