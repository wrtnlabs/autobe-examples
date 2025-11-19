import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";

export async function test_api_article_category_detail_timestamp_formats(
  connection: api.IConnection,
) {
  // Generate a random category ID for the test
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Retrieve the category details
  const category: IDiscussionBoardArticleCategory =
    await api.functional.discussionBoard.categories.at(connection, {
      categoryId,
    });
  typia.assert(category);

  // Validate created_at is in ISO 8601 format
  // ISO 8601 allows: YYYY-MM-DDTHH:mm:ss[.sss](Z|±HH:mm)
  const iso8601Regex =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/;

  TestValidator.predicate(
    "created_at should be in ISO 8601 format",
    iso8601Regex.test(category.created_at),
  );

  TestValidator.predicate(
    "updated_at should be in ISO 8601 format",
    iso8601Regex.test(category.updated_at),
  );

  // Validate timestamps can be parsed by standard ISO 8601 parser
  const createdAtDate = new Date(category.created_at);
  const updatedAtDate = new Date(category.updated_at);

  TestValidator.predicate(
    "created_at should be a valid parseable ISO 8601 datetime",
    !isNaN(createdAtDate.getTime()),
  );

  TestValidator.predicate(
    "updated_at should be a valid parseable ISO 8601 datetime",
    !isNaN(updatedAtDate.getTime()),
  );

  // Validate audit trail: updated_at >= created_at
  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at for proper audit trail",
    updatedAtDate.getTime() >= createdAtDate.getTime(),
  );
}
