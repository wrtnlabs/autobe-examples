import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test retrieving detailed information about a private community by an approved
 * member.
 *
 * This test validates the complete workflow of accessing private community
 * information as an approved member (creator). The test follows these steps:
 *
 * 1. Register and authenticate as a member
 * 2. Create a private community with specific settings
 * 3. Retrieve the community details as the creator (approved member)
 * 4. Validate that all community information is returned correctly
 * 5. Verify privacy type is 'private' and posting permissions are enforced
 */
export async function test_api_community_private_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const memberUsername = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<20>
    >(),
  );

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a private community with specific configuration
  const communityCode = RandomGenerator.alphaNumeric(
    typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<25>
    >(),
  );
  const communityName = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 7,
  });
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });

  const createdCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: communityName,
        description: communityDescription,
        privacy_type: "private",
        posting_permission: "approved_only",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: false,
        primary_category: "Technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(createdCommunity);

  // Step 3: Retrieve the private community details as the creator (approved member)
  const retrievedCommunity = await api.functional.redditLike.communities.at(
    connection,
    {
      communityId: createdCommunity.id,
    },
  );
  typia.assert(retrievedCommunity);

  // Step 4: Validate that all community information matches what was created
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    createdCommunity.id,
  );
  TestValidator.equals(
    "community code matches",
    retrievedCommunity.code,
    communityCode,
  );
  TestValidator.equals(
    "community name matches",
    retrievedCommunity.name,
    communityName,
  );
  TestValidator.equals(
    "community description matches",
    retrievedCommunity.description,
    communityDescription,
  );

  // Step 5: Verify privacy settings and posting permissions
  TestValidator.equals(
    "privacy type is private",
    retrievedCommunity.privacy_type,
    "private",
  );
  TestValidator.equals(
    "posting permission is approved_only",
    retrievedCommunity.posting_permission,
    "approved_only",
  );
  TestValidator.equals(
    "text posts are allowed",
    retrievedCommunity.allow_text_posts,
    true,
  );
  TestValidator.equals(
    "link posts are allowed",
    retrievedCommunity.allow_link_posts,
    true,
  );
  TestValidator.equals(
    "image posts are not allowed",
    retrievedCommunity.allow_image_posts,
    false,
  );
  TestValidator.equals(
    "primary category is Technology",
    retrievedCommunity.primary_category,
    "Technology",
  );

  // Verify community metadata
  TestValidator.equals(
    "subscriber count starts at zero",
    retrievedCommunity.subscriber_count,
    0,
  );
  TestValidator.equals(
    "community is not archived",
    retrievedCommunity.is_archived,
    false,
  );
}
