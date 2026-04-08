import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test community member retrieval when the specified community does not exist.
 *
 * Validates the API's behavior when attempting to retrieve membership information for a non-existent community.
 * Ensures that the system properly handles the missing community scenario by returning appropriate error responses.
 *
 * This test verifies that:
 * 1. HTTP 404 Not Found status code is returned for non-existent communities
 * 2. Error response indicates the community was not found
 * 3. System does not return partial or misleading information
 *
 * Special attention is given to proper connection isolation and validation of error responses using TestValidator.httpError.
 *
 * 1. Create actor-specific connection for the test
 * 2. Send GET request to retrieve member from non-existent community
 * 3. Validate HTTP 404 Not Found response
 * 4. Confirm proper error handling for missing community
 */
export async function test_api_community_member_nonexistent_community(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const testConnection: api.IConnection = { host: connection.host };
  // Generate non-existent community name and valid user UUID
  const nonExistentCommunityName = `nonexistent-community-${typia.random<string & tags.Format<"uuid">>()}`;
  const validUserUuid = typia.random<string & tags.Format<"uuid">>();
  // Send request to retrieve member from non-existent community
  // This should return HTTP 404 Not Found
  await TestValidator.httpError(
    "non-existent community returns 404",
    404,
    async () =>
      await api.functional.redditPlatform.communities.members.at(
        testConnection,
        {
          name: nonExistentCommunityName,
          userId: validUserUuid,
        },
      ),
  );
}
