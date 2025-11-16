import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";

/**
 * Validate that posts are created with searchable content structure.
 *
 * This test validates that posts can be created with distinctive keywords in
 * both title and body, establishing the foundation for search functionality.
 * The test creates a complete workflow from moderator setup through member post
 * creation, ensuring content is properly structured for future search
 * indexing.
 *
 * Note: This test validates post creation with search-ready content. Actual
 * search functionality validation would require a search API endpoint which is
 * not currently available in the provided API specifications.
 *
 * Workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Moderator creates a test community
 * 3. Create member account and authenticate
 * 4. Member creates a post with unique searchable keywords in title and body
 * 5. Verify the post is created with correct searchable content structure
 */
export async function test_api_post_creation_searchable_content(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community for testing
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a post with distinctive searchable keywords
  const distinctiveKeyword = `SEARCHTEST${RandomGenerator.alphaNumeric(8)}`;
  const postTitle = `Testing Search Functionality ${distinctiveKeyword}`;
  const postBody = `This post contains the distinctive keyword ${distinctiveKeyword} for search validation testing`;

  const createdPost = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: postTitle,
        post_type: "text",
        body: postBody,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(createdPost);

  // Step 5: Verify the post is created with correct searchable content structure
  TestValidator.equals(
    "post title contains distinctive keyword",
    createdPost.title,
    postTitle,
  );
  TestValidator.equals(
    "post body contains distinctive keyword",
    createdPost.body,
    postBody,
  );
  TestValidator.predicate(
    "title contains searchable keyword",
    createdPost.title.includes(distinctiveKeyword),
  );
  TestValidator.predicate(
    "body contains searchable keyword",
    typia.assert(createdPost.body!).includes(distinctiveKeyword),
  );
  TestValidator.equals("post type is text", createdPost.post_type, "text");
  TestValidator.equals(
    "post belongs to correct community",
    createdPost.community_id,
    community.id,
  );
  TestValidator.equals(
    "post authored by correct member",
    createdPost.member_id,
    member.id,
  );
}
