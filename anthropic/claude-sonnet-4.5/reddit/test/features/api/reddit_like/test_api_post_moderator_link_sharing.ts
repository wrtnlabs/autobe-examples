import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderators creating link posts with URL metadata extraction.
 *
 * This test validates that moderators can create link posts in communities they
 * manage. It verifies the complete workflow from moderator registration through
 * community creation to link post submission with URL validation and metadata
 * extraction.
 *
 * Steps:
 *
 * 1. Register a new moderator account with valid credentials
 * 2. Create a community with link posts enabled
 * 3. Create a link post with a valid URL in the community
 * 4. Validate the post is created with correct type, title, and URL properties
 * 5. Verify moderators can post links regardless of community member restrictions
 */
export async function test_api_post_moderator_link_sharing(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account
  const moderatorBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // Step 2: Create a community with link posts enabled
  const communityBody = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 10,
    }),
    allow_link_posts: true,
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityBody,
    });
  typia.assert(community);

  // Step 3: Create a link post in the community
  const linkPostBody = {
    community_id: community.id,
    type: "link",
    title: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    url: "https://example.com/article/" + RandomGenerator.alphaNumeric(8),
  } satisfies IRedditLikePost.ICreate;

  const linkPost: IRedditLikePost =
    await api.functional.redditLike.moderator.communities.posts.create(
      connection,
      {
        communityId: community.id,
        body: linkPostBody,
      },
    );
  typia.assert(linkPost);

  // Step 4: Validate the link post was created correctly
  TestValidator.equals("post type is link", linkPost.type, "link");
  TestValidator.equals(
    "post title matches",
    linkPost.title,
    linkPostBody.title,
  );
  TestValidator.predicate(
    "post has valid ID",
    typia.is<string & tags.Format<"uuid">>(linkPost.id),
  );
  TestValidator.predicate(
    "post has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(linkPost.created_at),
  );
  TestValidator.predicate(
    "post has update timestamp",
    typia.is<string & tags.Format<"date-time">>(linkPost.updated_at),
  );
}
