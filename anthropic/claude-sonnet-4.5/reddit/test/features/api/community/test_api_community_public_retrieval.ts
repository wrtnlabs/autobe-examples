import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test retrieving detailed information about a public community without
 * authentication.
 *
 * This test validates that public communities are accessible to all users
 * including guests (unauthenticated users). The workflow creates a member
 * account, uses that account to create a public community, then retrieves the
 * community information without authentication to verify public accessibility.
 *
 * Steps:
 *
 * 1. Register and authenticate a member account
 * 2. Create a public community with the authenticated member
 * 3. Clear authentication to simulate guest access
 * 4. Retrieve the community details without authentication
 * 5. Validate all community data is correctly returned
 */
export async function test_api_community_public_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member account
  const memberData = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
  } satisfies IRedditLikeMember.ICreate;

  const authenticatedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create a public community with the authenticated member
  const communityData = {
    code: RandomGenerator.alphaNumeric(15),
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 6 }),
    description: RandomGenerator.paragraph({
      sentences: 8,
      wordMin: 4,
      wordMax: 8,
    }),
    icon_url: typia.random<string & tags.Format<"url">>(),
    banner_url: typia.random<string & tags.Format<"url">>(),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
    primary_category: "Technology",
    secondary_tags: "programming,software,development",
  } satisfies IRedditLikeCommunity.ICreate;

  const createdCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(createdCommunity);

  // Step 3: Clear authentication to simulate guest access
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Retrieve the community details without authentication
  const retrievedCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.communities.at(unauthenticatedConnection, {
      communityId: createdCommunity.id,
    });
  typia.assert(retrievedCommunity);

  // Step 5: Validate all community data is correctly returned
  TestValidator.equals(
    "retrieved community ID matches created community",
    retrievedCommunity.id,
    createdCommunity.id,
  );

  TestValidator.equals(
    "community code matches",
    retrievedCommunity.code,
    createdCommunity.code,
  );

  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    createdCommunity.name,
  );

  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    createdCommunity.description,
  );

  TestValidator.equals(
    "privacy type is public",
    retrievedCommunity.privacy_type,
    "public",
  );

  TestValidator.equals(
    "posting permission matches",
    retrievedCommunity.posting_permission,
    createdCommunity.posting_permission,
  );

  TestValidator.equals(
    "text posts allowed flag matches",
    retrievedCommunity.allow_text_posts,
    createdCommunity.allow_text_posts,
  );

  TestValidator.equals(
    "link posts allowed flag matches",
    retrievedCommunity.allow_link_posts,
    createdCommunity.allow_link_posts,
  );

  TestValidator.equals(
    "image posts allowed flag matches",
    retrievedCommunity.allow_image_posts,
    createdCommunity.allow_image_posts,
  );

  TestValidator.equals(
    "primary category matches",
    retrievedCommunity.primary_category,
    createdCommunity.primary_category,
  );

  TestValidator.equals(
    "subscriber count initialized to zero",
    retrievedCommunity.subscriber_count,
    0,
  );

  TestValidator.equals(
    "community not archived",
    retrievedCommunity.is_archived,
    false,
  );
}
