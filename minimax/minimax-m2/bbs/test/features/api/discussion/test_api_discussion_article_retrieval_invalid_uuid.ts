import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IEconPoliticalDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionArticle";
import type { IEconPoliticalDiscussionAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionAttachment";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_discussion_article_retrieval_invalid_uuid(
  connection: api.IConnection,
) {
  // Test with completely malformed UUID string
  await TestValidator.httpError(
    "should return 400 for malformed UUID format",
    400,
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: "not-a-valid-uuid-format",
      });
    },
  );

  // Test with too short UUID
  await TestValidator.httpError(
    "should return 400 for too short UUID",
    400,
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: "123-456",
      });
    },
  );

  // Test with UUID containing invalid characters
  await TestValidator.httpError(
    "should return 400 for UUID with invalid characters",
    400,
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: "12345678-1234-1234-1234-123456789XYZ",
      });
    },
  );

  // Test with empty string
  await TestValidator.httpError(
    "should return 400 for empty string UUID",
    400,
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: "",
      });
    },
  );

  // Test with null-like string
  await TestValidator.httpError(
    "should return 400 for null-like string",
    400,
    async () => {
      await api.functional.econPoliticalDiscussion.articles.at(connection, {
        articleId: "null",
      });
    },
  );
}
