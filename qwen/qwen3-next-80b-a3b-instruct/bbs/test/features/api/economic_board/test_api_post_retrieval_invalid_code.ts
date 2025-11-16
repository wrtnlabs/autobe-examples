import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardPost";

export async function test_api_post_retrieval_invalid_code(
  connection: api.IConnection,
) {
  // Test with empty post code - should return 404
  await TestValidator.httpError(
    "empty post code should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "",
      });
    },
  );

  // Test with post code containing special characters - should return 404
  await TestValidator.httpError(
    "post code with special characters should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "post!@#$%",
      });
    },
  );

  // Test with post code containing spaces - should return 404
  await TestValidator.httpError(
    "post code with spaces should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "post code with spaces",
      });
    },
  );

  // Test with post code that is too long - should return 404
  await TestValidator.httpError(
    "post code that is too long should return 404",
    404,
    async () => {
      const longPostCode = RandomGenerator.alphaNumeric(257); // Exceeds typical max length
      await api.functional.economicBoard.posts.at(connection, {
        postCode: longPostCode,
      });
    },
  );

  // Test with non-alphanumeric characters - should return 404
  await TestValidator.httpError(
    "post code with non-alphanumeric characters should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "post_code_with_underscore",
      });
    },
  );

  // Test with a valid UUID format (should still fail as it's not alphanumeric with hyphens format) - should return 404
  await TestValidator.httpError(
    "post code in UUID format should return 404 (wrong format)",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // Test with numeric-only post code (should be invalid if format requires alphanumerics + hyphens) - should return 404
  await TestValidator.httpError(
    "numeric-only post code should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "1234567890",
      });
    },
  );

  // Test with post code that exists but is not alphanumeric with hyphens format - should return 404
  await TestValidator.httpError(
    "valid-looking post code with wrong format should return 404",
    404,
    async () => {
      await api.functional.economicBoard.posts.at(connection, {
        postCode: "TEST-POST-1234" + "A", // Add extra character to make it invalid format
      });
    },
  );
}
