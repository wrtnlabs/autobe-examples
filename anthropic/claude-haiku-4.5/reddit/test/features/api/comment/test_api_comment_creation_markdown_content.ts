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

export async function test_api_comment_creation_markdown_content(
  connection: api.IConnection,
) {
  // Setup: Create administrator for category creation
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Setup: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Setup: Create member (comment author)
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Setup: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Setup: Create post for commenting
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

  // Test 1: Minimal markdown content (1 character)
  const minimalComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: "a",
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(minimalComment);
  TestValidator.equals(
    "minimal content preserved",
    minimalComment.content,
    "a",
  );
  TestValidator.equals(
    "minimal comment creator matches",
    minimalComment.creator.id,
    member.id,
  );
  TestValidator.equals(
    "vote score initialized to zero",
    minimalComment.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote count initialized to zero",
    minimalComment.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote count initialized to zero",
    minimalComment.downvote_count,
    0,
  );

  // Test 2: Bold markdown formatting
  const boldContent = "**bold text** is important";
  const boldComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: boldContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(boldComment);
  TestValidator.equals(
    "bold markdown preserved",
    boldComment.content,
    boldContent,
  );

  // Test 3: Italic markdown formatting
  const italicContent = "_italic text_ looks good";
  const italicComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: italicContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(italicComment);
  TestValidator.equals(
    "italic markdown preserved",
    italicComment.content,
    italicContent,
  );

  // Test 4: Links markdown formatting
  const linkContent =
    "Check out [this link](https://example.com) for more info";
  const linkComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: linkContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(linkComment);
  TestValidator.equals(
    "link markdown preserved",
    linkComment.content,
    linkContent,
  );

  // Test 5: Code block markdown formatting
  const codeContent = "```javascript\nconst x = 42;\nconsole.log(x);\n```";
  const codeComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: codeContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(codeComment);
  TestValidator.equals(
    "code block markdown preserved",
    codeComment.content,
    codeContent,
  );

  // Test 6: Lists markdown formatting
  const listContent = "- Item 1\n- Item 2\n- Item 3\n\n1. First\n2. Second";
  const listComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: listContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(listComment);
  TestValidator.equals(
    "list markdown preserved",
    listComment.content,
    listContent,
  );

  // Test 7: Complex markdown with multiple formatting
  const complexContent =
    "# Header\n**bold** and _italic_ with [link](http://example.com)\n```\ncode\n```\n- list\n- items";
  const complexComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: complexContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(complexComment);
  TestValidator.equals(
    "complex markdown preserved",
    complexComment.content,
    complexContent,
  );

  // Test 8: Special characters in markdown
  const specialContent =
    "Special chars: @#$%^&*() and markdown: `code`, **bold**, _italic_";
  const specialComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: specialContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(specialComment);
  TestValidator.equals(
    "special characters preserved",
    specialComment.content,
    specialContent,
  );

  // Test 9: Escaped markdown characters
  const escapedContent = "Escaped: \\*not bold\\*, \\[not link\\](url)";
  const escapedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: escapedContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(escapedComment);
  TestValidator.equals(
    "escaped markdown preserved",
    escapedComment.content,
    escapedContent,
  );

  // Test 10: Maximum content length (10000 characters)
  const maxContent = RandomGenerator.content({
    paragraphs: 50,
    sentenceMin: 15,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  }).substring(0, 10000);
  const maxComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: maxContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(maxComment);
  TestValidator.equals(
    "maximum content length accepted",
    maxComment.content.length <= 10000,
    true,
  );

  // Test 11: Nested comment (reply) with markdown
  const replyContent = "**Great** comment! _I agree_ with [this point](url).";
  const nestedComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        parent_comment_id: minimalComment.id,
        content: replyContent,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(nestedComment);
  TestValidator.equals(
    "nested comment markdown preserved",
    nestedComment.content,
    replyContent,
  );
  TestValidator.equals(
    "nested comment parent reference correct",
    nestedComment.community_platform_parent_comment_id,
    minimalComment.id,
  );
  TestValidator.equals(
    "nesting depth set correctly",
    nestedComment.nesting_depth,
    1,
  );

  // Test 12: Verify markdown is not HTML-converted
  const markdownNotHtml = "**bold** should not become <strong>bold</strong>";
  const htmlCheckComment: ICommunityPlatformComment =
    await api.functional.communityPlatform.member.comments.create(connection, {
      body: {
        post_id: post.id,
        content: markdownNotHtml,
      } satisfies ICommunityPlatformComment.ICreate,
    });
  typia.assert(htmlCheckComment);
  TestValidator.equals(
    "markdown not converted to HTML",
    htmlCheckComment.content,
    markdownNotHtml,
  );
  TestValidator.predicate(
    "response does not contain HTML tags",
    !htmlCheckComment.content.includes("<strong>"),
  );
}
