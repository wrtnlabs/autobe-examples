import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_detail_invalid_category_id_format(
  connection: api.IConnection,
) {
  // Test 1: Invalid format - non-UUID string
  await TestValidator.error(
    "should reject non-UUID string 'invalid-id'",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: "invalid-id" as any,
      });
    },
  );

  // Test 2: Invalid format - numeric string
  await TestValidator.error(
    "should reject numeric string '12345'",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: "12345" as any,
      });
    },
  );

  // Test 3: Invalid format - random alphanumeric
  await TestValidator.error(
    "should reject random alphanumeric 'not-a-uuid'",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: "not-a-uuid" as any,
      });
    },
  );

  // Test 4: Invalid format - empty string
  await TestValidator.error("should reject empty string", async () => {
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId: "" as any,
    });
  });

  // Test 5: Invalid format - UUID-like but incorrect format
  await TestValidator.error(
    "should reject malformed UUID with missing hyphens",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: "550e8400e29b41d4a716446655440000" as any,
      });
    },
  );

  // Test 6: Invalid format - UUID with lowercase letters in wrong position
  await TestValidator.error(
    "should reject partially valid UUID format",
    async () => {
      await api.functional.discussionBoard.categories.at(connection, {
        categoryId: "550e8400-e29b-41d4-a716-44665544000g" as any,
      });
    },
  );
}
