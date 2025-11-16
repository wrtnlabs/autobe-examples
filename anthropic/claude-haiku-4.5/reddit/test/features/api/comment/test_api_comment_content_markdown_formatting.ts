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

export async function test_api_comment_content_markdown_formatting(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create a category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Technology discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create a community for posting
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: "Community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a post to comment on
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Markdown formatting test post",
        content_text: "This is a test post for markdown comments",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 6: Create comments with various markdown formatting
  const markdownComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: `**Bold text** for emphasis\n*Italic text* for style\n\`\`\`\ncode block example\nfunction test() {\n  return true;\n}\n\`\`\`\n[Link to example](https://example.com)\n\n- Bullet point 1\n- Bullet point 2\n  - Nested bullet point\n\n1. Numbered item 1\n2. Numbered item 2\n3. Numbered item 3\n\nLine break test with multiple\\nline breaks\\nshould work correctly`,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(markdownComment);

  // Step 7: Validate markdown content is preserved
  TestValidator.equals(
    "markdown content preserved in comment",
    markdownComment.content.includes("**Bold text**"),
    true,
  );
  TestValidator.equals(
    "italic markdown preserved",
    markdownComment.content.includes("*Italic text*"),
    true,
  );
  TestValidator.equals(
    "code block preserved",
    markdownComment.content.includes("```"),
    true,
  );
  TestValidator.equals(
    "link markdown preserved",
    markdownComment.content.includes("[Link to example](https://example.com)"),
    true,
  );
  TestValidator.equals(
    "bullet points preserved",
    markdownComment.content.includes("- Bullet point 1"),
    true,
  );
  TestValidator.equals(
    "numbered list preserved",
    markdownComment.content.includes("1. Numbered item 1"),
    true,
  );

  // Step 8: Create nested reply with markdown formatting
  const nestedComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: markdownComment.id,
        content: `> Quote example\n\n**Response** to the previous comment\n\nSome text with [inline link](https://test.com) in the middle`,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedComment);

  // Step 9: Verify nested comment preserves markdown
  TestValidator.equals(
    "nested comment markdown preserved",
    nestedComment.content.includes("**Response**"),
    true,
  );
  TestValidator.equals(
    "inline link in reply preserved",
    nestedComment.content.includes("[inline link](https://test.com)"),
    true,
  );
  TestValidator.equals(
    "nesting depth is correct",
    nestedComment.nesting_depth,
    1,
  );
  TestValidator.equals(
    "parent comment reference is correct",
    nestedComment.community_platform_parent_comment_id,
    markdownComment.id,
  );

  // Step 10: Create another comment with complex formatting
  const complexComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: `# Heading 1\n## Heading 2\n### Heading 3\n\n**Bold** and *italic* and ***bold italic***\n\n\`inline code\`\n\n\`\`\`javascript\nconst markdown = true;\nconsole.log(markdown);\n\`\`\`\n\n> Blockquote line 1\n> Blockquote line 2\n\n| Column 1 | Column 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n| Cell 3   | Cell 4   |`,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(complexComment);

  // Step 11: Verify complex formatting is stored accurately
  TestValidator.equals(
    "heading markdown preserved",
    complexComment.content.includes("# Heading 1"),
    true,
  );
  TestValidator.equals(
    "bold italic preserved",
    complexComment.content.includes("***bold italic***"),
    true,
  );
  TestValidator.equals(
    "inline code preserved",
    complexComment.content.includes("`inline code`"),
    true,
  );
  TestValidator.equals(
    "blockquote preserved",
    complexComment.content.includes("> Blockquote line 1"),
    true,
  );
  TestValidator.equals(
    "table markdown preserved",
    complexComment.content.includes("| Column 1 | Column 2 |"),
    true,
  );

  // Step 12: Verify comment metadata is correct
  TestValidator.equals(
    "original comment visibility is visible",
    markdownComment.visibility_status,
    "visible",
  );
  TestValidator.equals(
    "original comment is not locked",
    markdownComment.is_locked,
    false,
  );
  TestValidator.equals(
    "original comment vote score starts at zero",
    markdownComment.vote_score,
    0,
  );
  TestValidator.equals(
    "original comment has no upvotes initially",
    markdownComment.upvote_count,
    0,
  );
  TestValidator.equals(
    "original comment has no downvotes initially",
    markdownComment.downvote_count,
    0,
  );
}
