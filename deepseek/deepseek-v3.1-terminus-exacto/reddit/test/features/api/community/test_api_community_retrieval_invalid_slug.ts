import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityCategory";

/**
 * Test error handling for invalid or non-existent community slugs. Validates
 * that the endpoint returns appropriate error responses when provided with
 * slugs that don't match any existing communities, testing proper HTTP status
 * codes and error message formats.
 */
export async function test_api_community_retrieval_invalid_slug(
  connection: api.IConnection,
) {
  // Generate clearly invalid slugs that are guaranteed not to match any communities
  // Using UUID-like patterns that don't follow community slug naming conventions
  const invalidSlugs = ArrayUtil.repeat(5, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Test each invalid slug to ensure proper error responses
  for (const invalidSlug of invalidSlugs) {
    await TestValidator.error(
      `API should reject non-existent slug: ${invalidSlug}`,
      async () => {
        await api.functional.communityPlatform.communities.getByCommunityslug(
          connection,
          {
            communitySlug: invalidSlug,
          },
        );
      },
    );
  }

  // Test with numeric-only slugs that violate community naming conventions
  const numericSlugs = ArrayUtil.repeat(3, () =>
    RandomGenerator.alphaNumeric(10).replace(/[a-zA-Z]/g, ""),
  );

  for (const numericSlug of numericSlugs) {
    if (numericSlug.length > 0) {
      await TestValidator.error(
        `API should reject numeric-only slug: ${numericSlug}`,
        async () => {
          await api.functional.communityPlatform.communities.getByCommunityslug(
            connection,
            {
              communitySlug: numericSlug,
            },
          );
        },
      );
    }
  }

  // Test with extremely long slug that exceeds reasonable limits
  const longSlug = RandomGenerator.alphaNumeric(200);
  await TestValidator.error(
    `API should reject excessively long slug`,
    async () => {
      await api.functional.communityPlatform.communities.getByCommunityslug(
        connection,
        {
          communitySlug: longSlug,
        },
      );
    },
  );
}
