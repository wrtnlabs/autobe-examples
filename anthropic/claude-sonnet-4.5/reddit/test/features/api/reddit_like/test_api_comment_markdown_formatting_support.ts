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
 * Test markdown formatting support in comment content.
 *
 * This test validates that comments support rich markdown formatting in their
 * content_text field. The test follows a complete user workflow to ensure
 * markdown content is preserved throughout the comment creation and retrieval
 * process.
 *
 * Workflow:
 *
 * 1. Create and authenticate a member account
 * 2. Create a community for hosting the discussion
 * 3. Create a post within the community
 * 4. Create a comment with markdown-formatted content
 * 5. Verify markdown content is preserved correctly
 */
export async function test_api_comment_markdown_formatting_support(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create community
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Create post
  const post = await api.functional.redditLike.member.posts.create(connection, {
    body: {
      community_id: community.id,
      type: "text",
      title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
      body: RandomGenerator.paragraph({ sentences: 5 }),
    } satisfies IRedditLikePost.ICreate,
  });
  typia.assert(post);

  // Step 4: Create comment with markdown formatting
  const markdownContent =
    "This comment has **bold text**, *italic text*, [a link](https://example.com), and `inline code` formatting.";

  const comment = await api.functional.redditLike.member.comments.create(
    connection,
    {
      body: {
        reddit_like_post_id: post.id,
        content_text: markdownContent,
      } satisfies IRedditLikeComment.ICreate,
    },
  );
  typia.assert(comment);

  // Step 5: Validate markdown content is preserved
  TestValidator.equals(
    "markdown content should be preserved",
    comment.content_text,
    markdownContent,
  );
}
