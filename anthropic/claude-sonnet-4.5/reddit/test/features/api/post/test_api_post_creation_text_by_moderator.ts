import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderator text post creation workflow.
 *
 * Validates the complete process of a moderator creating a text post in a
 * community. This test ensures that moderators can successfully contribute text
 * content with markdown formatting to communities.
 *
 * Test workflow:
 *
 * 1. Register a new member account to create the community
 * 2. Member creates a community where the moderator will post
 * 3. Register a new moderator account
 * 4. Moderator creates a text post with title and body content
 * 5. Validate post creation with correct type, content, and timestamps
 */
export async function test_api_post_creation_text_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Register member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityCode = RandomGenerator.alphaNumeric(10);
  const communityName = RandomGenerator.name(2);
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 3: Register moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password: moderatorPassword,
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Moderator creates a text post
  const postTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 7,
  });
  const postBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const post = await api.functional.redditLike.moderator.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: postTitle,
        body: postBody,
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Validate post creation
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals("post type is text", post.type, "text");

  // Validate post ID is valid UUID format
  TestValidator.predicate(
    "post ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      post.id,
    ),
  );

  // Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(new Date(post.created_at).getTime()),
  );

  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(new Date(post.updated_at).getTime()),
  );
}
