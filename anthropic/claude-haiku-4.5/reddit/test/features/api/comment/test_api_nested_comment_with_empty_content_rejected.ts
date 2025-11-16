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

export async function test_api_nested_comment_with_empty_content_rejected(
  connection: api.IConnection,
) {
  // 1. Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "ValidPassword123!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: memberPassword,
      ip: "127.0.0.1",
      href: "http://localhost:3000/join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      username: RandomGenerator.alphabets(10),
      password: adminPassword,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/admin-join",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 3. Switch to admin and create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: "http://localhost:3000/admin-login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

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

  // 4. Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/member-login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

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

  // 5. Create a post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Test Post for Comments",
        content_text: "This is a test post for nested comments",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Create a parent comment
  const parentComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "This is a parent comment with content",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment should start with zero children",
    parentComment.child_comment_count,
    0,
  );

  // 7. Test nested reply with empty string content - should fail
  await TestValidator.error(
    "nested reply with empty content should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.comments.create(
        connection,
        {
          commentId: parentComment.id,
          body: {
            post_id: post.id,
            content: "",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 8. Test nested reply with whitespace-only content - should fail
  await TestValidator.error(
    "nested reply with whitespace-only content should be rejected",
    async () => {
      await api.functional.communityPlatform.member.comments.comments.create(
        connection,
        {
          commentId: parentComment.id,
          body: {
            post_id: post.id,
            content: "   \t\n  ",
          } satisfies ICommunityPlatformComment.ICreate,
        },
      );
    },
  );

  // 9. Verify parent comment child count hasn't changed after failed attempts
  TestValidator.equals(
    "parent comment should still have zero children after failed validation attempts",
    parentComment.child_comment_count,
    0,
  );

  // 10. Test successful nested reply creation with valid content to confirm API works
  const validNestedReply =
    await api.functional.communityPlatform.member.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: post.id,
          content: "This is a valid nested reply with proper content",
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(validNestedReply);
  TestValidator.equals(
    "nested reply content should match input",
    validNestedReply.content,
    "This is a valid nested reply with proper content",
  );
  TestValidator.equals(
    "nested reply should have correct nesting depth",
    validNestedReply.nesting_depth,
    1,
  );
}
