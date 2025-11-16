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

export async function test_api_nested_comment_with_markdown_formatting(
  connection: api.IConnection,
) {
  // 1. Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin context to create category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      href: "https://example.com/admin",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // 3. Create a category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
          description: "Tech discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "TestPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: "A place for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Discussion about Markdown",
        content_text: "Let's discuss markdown formatting capabilities",
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create a parent comment
  const parentComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content:
          "Here are my thoughts on this topic. **Bold text** and *italic text* are important.",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(parentComment);

  // 7. Create a nested reply with comprehensive markdown formatting
  const markdownContent = `Here's a comprehensive markdown example:

**This text is bold** and *this text is italic*

You can visit [our website](https://example.com) for more info.

\`\`\`
const example = "code block";
console.log(example);
\`\`\`

And here's a list:
- First item
- Second item
- Third item

**Important note:** Markdown formatting should be preserved!`;

  const nestedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.comments.create(
      connection,
      {
        commentId: parentComment.id,
        body: {
          post_id: post.id,
          parent_comment_id: parentComment.id,
          content: markdownContent,
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(nestedComment);

  // 8. Verify the response contains exact markdown content
  TestValidator.equals(
    "nested comment content matches submitted markdown",
    nestedComment.content,
    markdownContent,
  );

  // 9. Validate nesting structure
  TestValidator.equals(
    "nested comment has correct parent reference",
    nestedComment.community_platform_parent_comment_id,
    parentComment.id,
  );

  TestValidator.equals(
    "nested comment has correct post reference",
    nestedComment.community_platform_post_id,
    post.id,
  );

  TestValidator.predicate(
    "nested comment nesting depth is 1",
    nestedComment.nesting_depth === 1,
  );

  TestValidator.predicate(
    "nested comment is visible",
    nestedComment.visibility_status === "visible",
  );

  TestValidator.predicate(
    "markdown content includes bold formatting",
    nestedComment.content.includes("**This text is bold**"),
  );

  TestValidator.predicate(
    "markdown content includes italic formatting",
    nestedComment.content.includes("*this text is italic*"),
  );

  TestValidator.predicate(
    "markdown content includes link",
    nestedComment.content.includes("[our website](https://example.com)"),
  );

  TestValidator.predicate(
    "markdown content includes code block",
    nestedComment.content.includes("```"),
  );

  TestValidator.predicate(
    "markdown content includes list items",
    nestedComment.content.includes("- First item"),
  );
}
