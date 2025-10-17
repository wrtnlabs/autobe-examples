import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test comment creation with markdown-formatted content.
 *
 * This test validates that the platform properly handles and preserves markdown
 * syntax in comments. It creates a comment containing various markdown elements
 * such as bold text, italic text, links, lists, and code blocks, then verifies
 * the content is stored with markdown syntax intact.
 *
 * Test workflow:
 *
 * 1. Authenticate as member to create community, post, and markdown comment
 * 2. Create community to host the post
 * 3. Create post to receive markdown comment
 * 4. Create comment with rich markdown content
 * 5. Validate markdown content is preserved and comment structure is correct
 */
export async function test_api_comment_creation_with_markdown_content(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const usernameLength = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
  >() satisfies number as number;
  const username = RandomGenerator.alphaNumeric(usernameLength);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: username,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community to host the post
  const communityCodeLength = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<25>
  >() satisfies number as number;
  const communityCode = RandomGenerator.alphaNumeric(communityCodeLength);

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post to receive markdown comment
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: RandomGenerator.paragraph({
        sentences: 2,
        wordMin: 3,
        wordMax: 7,
      }),
      body: RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 5,
        sentenceMax: 10,
      }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create comment with rich markdown content
  const markdownContent = [
    "# Markdown Test Comment",
    "",
    "This comment contains **bold text** and *italic text* to test markdown formatting.",
    "",
    "## Code Block",
    "```typescript",
    "const example = 'Hello World';",
    "console.log(example);",
    "```",
    "",
    "## List Example",
    "- Item one",
    "- Item two with [a link](https://example.com)",
    "- Item three",
    "",
    "### Inline Code",
    "Use `inline code` for highlighting.",
    "",
    "> This is a blockquote for emphasis.",
  ].join("\n");

  const comment = await api.functional.redditLike.member.posts.comments.create(
    connection,
    {
      postId: post.id,
      body: {
        reddit_like_post_id: post.id,
        content_text: markdownContent,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Validate markdown content is preserved and comment structure is correct
  TestValidator.equals(
    "comment post reference matches",
    comment.reddit_like_post_id,
    post.id,
  );
  TestValidator.equals(
    "markdown content preserved",
    comment.content_text,
    markdownContent,
  );
  TestValidator.predicate(
    "content within character limit",
    comment.content_text.length >= 1 && comment.content_text.length <= 10000,
  );
  TestValidator.equals("top-level comment depth", comment.depth, 0);
  TestValidator.predicate(
    "comment has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
  TestValidator.equals("initial vote score is zero", comment.vote_score, 0);
  TestValidator.equals("comment not edited initially", comment.edited, false);
}
