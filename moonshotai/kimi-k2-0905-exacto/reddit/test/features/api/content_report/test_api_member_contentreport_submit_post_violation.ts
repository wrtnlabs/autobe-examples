import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test member account creation and post generation workflow in Reddit Community
 * platform.
 *
 * This test validates the foundational community operations where members can
 * register accounts and create posts with different content types. The scenario
 * covers:
 *
 * 1. Creating multiple member accounts for community participation
 * 2. Creating posts with various content types and community associations
 * 3. Validating member authentication and post creation workflows
 * 4. Ensuring proper member-to-post relationships are established
 *
 * Note: Content reporting functionality referenced in the test name is not
 * available in the current API set, so this test focuses on the core member and
 * post operations that would be prerequisites for any reporting system.
 */
export async function test_api_member_contentreport_submit_post_violation(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (potential reporter)
  const firstMemberEmail = typia.random<string & tags.Format<"email">>();
  const firstMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: firstMemberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(firstMember);

  // Step 2: Create second member account (potential content author)
  const secondMemberEmail = typia.random<string & tags.Format<"email">>();
  const secondMember = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: secondMemberEmail,
      password: "SecurePass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(secondMember);

  // Step 3: Create a text post by the second member
  const textPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(textPost);

  // Step 4: Create a link post by the first member
  const linkPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        link_url: "https://example.com/interesting-article",
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(linkPost);

  // Validate member registration success
  TestValidator.equals(
    "first member created successfully",
    firstMember.email,
    firstMemberEmail,
  );
  TestValidator.equals(
    "second member created successfully",
    secondMember.email,
    secondMemberEmail,
  );
  TestValidator.predicate(
    "first member has valid ID",
    typeof firstMember.id === "string",
  );
  TestValidator.predicate(
    "second member has valid ID",
    typeof secondMember.id === "string",
  );

  // Validate post creation and ownership
  TestValidator.equals(
    "text post author is second member",
    textPost.author.id,
    secondMember.id,
  );
  TestValidator.equals(
    "text post has content",
    typeof textPost.content,
    "string",
  );
  TestValidator.equals("text post has title", typeof textPost.title, "string");

  TestValidator.equals(
    "link post author is first member",
    linkPost.author.id,
    firstMember.id,
  );
  TestValidator.equals(
    "link post has URL",
    linkPost.link_url,
    "https://example.com/interesting-article",
  );
  TestValidator.equals("link post has title", typeof linkPost.title, "string");

  // Validate post metrics are properly initialized
  TestValidator.equals(
    "text post starts with zero upvotes",
    textPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "text post starts with zero downvotes",
    textPost.downvote_count,
    0,
  );
  TestValidator.equals(
    "link post starts with zero upvotes",
    linkPost.upvote_count,
    0,
  );
  TestValidator.equals(
    "link post starts with zero downvotes",
    linkPost.downvote_count,
    0,
  );

  // Validate post is not locked or pinned by default
  TestValidator.equals(
    "text post is not locked by default",
    textPost.is_locked,
    false,
  );
  TestValidator.equals(
    "text post is not pinned by default",
    textPost.is_pinned,
    false,
  );
  TestValidator.equals(
    "link post is not locked by default",
    linkPost.is_locked,
    false,
  );
  TestValidator.equals(
    "link post is not pinned by default",
    linkPost.is_pinned,
    false,
  );
}
