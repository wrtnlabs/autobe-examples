import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

export async function test_api_post_retrieval_url_encoded_post_code(
  connection: api.IConnection,
) {
  // Generate valid communityCode and base postCode
  const communityCode = RandomGenerator.alphaNumeric(8);
  const basePostCode = "my+post+title";
  const encodedPostCode = encodeURIComponent(basePostCode);

  // Retrieve the post using the URL-encoded postCode
  const retrievedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode,
      postCode: encodedPostCode,
    });
  typia.assert(retrievedPost);

  // Test with special characters encoded
  const specialPostCode = "test!@#$%^&*()_=+[]{}|;:,.<>?";
  const encodedSpecialPostCode = encodeURIComponent(specialPostCode);

  const retrievedSpecialPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode,
      postCode: encodedSpecialPostCode,
    });
  typia.assert(retrievedSpecialPost);

  // Test with spaced postCode properly encoded (%20)
  const spacedPostCode = "this is a test";
  const encodedSpacedPostCode = encodeURIComponent(spacedPostCode);

  const retrievedSpacedPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode,
      postCode: encodedSpacedPostCode,
    });
  typia.assert(retrievedSpacedPost);

  // Test with postCode that is a valid non-empty string
  const validStringPostCode = "valid123";
  const encodedValidStringPostCode = encodeURIComponent(validStringPostCode);

  const retrievedValidPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode,
      postCode: encodedValidStringPostCode,
    });
  typia.assert(retrievedValidPost);

  // Validate that empty string fails with 404 or similar — this tests API contract
  // Not a type error! We use an empty string typed as a string — allowed,
  // but the system should not find a post with empty code
  await TestValidator.error("should reject empty string postCode", async () => {
    await api.functional.communityPlatform.communities.posts.at(connection, {
      communityCode,
      postCode: "", // Valid type: string, empty — trigger 404
    });
  });
}
