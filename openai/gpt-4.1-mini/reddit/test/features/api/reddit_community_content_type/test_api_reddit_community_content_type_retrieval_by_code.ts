import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";

export async function test_api_reddit_community_content_type_retrieval_by_code(
  connection: api.IConnection,
) {
  // Define a realistic content type code that likely exists.
  // Since there is no dependency or set of codes given, we generate a random code pattern
  const validCode = "text";

  // Try to retrieve the content type with that valid code
  const validContentType: IRedditCommunityContentType =
    await api.functional.redditCommunity.redditCommunityContentTypes.at(
      connection,
      {
        contentTypeCode: validCode,
      },
    );
  typia.assert(validContentType);

  // Validate essential fields are returned correctly
  TestValidator.equals(
    "correct code returned",
    validContentType.content_type_code,
    validCode,
  );
  TestValidator.predicate(
    "name is a non-empty string",
    typeof validContentType.content_type_name === "string" &&
      validContentType.content_type_name.length > 0,
  );

  // description: optional nullable string - allow null
  TestValidator.predicate(
    "description is string or null or undefined",
    validContentType.description === null ||
      validContentType.description === undefined ||
      typeof validContentType.description === "string",
  );

  // Test retrieving a non-existing code, expecting error
  const invalidCode = "non_existent_code_1234567890";
  await TestValidator.error(
    "should throw error for non-existent code",
    async () => {
      await api.functional.redditCommunity.redditCommunityContentTypes.at(
        connection,
        {
          contentTypeCode: invalidCode,
        },
      );
    },
  );
}
