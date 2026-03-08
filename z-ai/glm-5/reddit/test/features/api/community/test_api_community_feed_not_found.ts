import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test that the community feed endpoint returns a 404 error when
 * requesting a feed for a non-existent community.
 *
 * This test validates the error handling requirement: when a community
 * name that does not exist is provided, the system should return an
 * HTTP 404 error with an appropriate error message.
 */
export async function test_api_community_feed_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community name that definitely does not exist
  const nonExistentCommunityName = `nonexistent_${RandomGenerator.alphaNumeric(16)}`;
  // Prepare a valid request body for the feed
  const requestBody = {
    sort: "new" as const,
    limit: 25,
  } satisfies ICommunityPlatformPost.IRequest;
  // Test that requesting a non-existent community returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent community",
    404,
    async () =>
      await api.functional.communityPlatform.communities.feed.index(
        connection,
        {
          communityName: nonExistentCommunityName,
          body: requestBody,
        },
      ),
  );
  // Test with different non-existent community name variations
  const anotherNonExistentName = `nonexistent_${RandomGenerator.alphaNumeric(16)}`;
  await TestValidator.httpError(
    "should return 404 for another non-existent community",
    404,
    async () =>
      await api.functional.communityPlatform.communities.feed.index(
        connection,
        {
          communityName: anotherNonExistentName,
          body: requestBody,
        },
      ),
  );
  // Test with special characters in community name
  const specialCharName = `nonexistent_special_${RandomGenerator.alphabets(8)}`;
  await TestValidator.httpError(
    "should return 404 for community name with special pattern",
    404,
    async () =>
      await api.functional.communityPlatform.communities.feed.index(
        connection,
        {
          communityName: specialCharName,
          body: requestBody,
        },
      ),
  );
}
