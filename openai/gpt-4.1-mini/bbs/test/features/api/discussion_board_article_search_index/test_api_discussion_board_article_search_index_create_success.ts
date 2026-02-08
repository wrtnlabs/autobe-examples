import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_discussion_board_article_search_indexes_create_article_search_index } from "../../../generate/generate_random_discussion_board_article_search_indexes_create_article_search_index";
import { prepare_random_discussion_board_article_search_index } from "../../../prepare/prepare_random_discussion_board_article_search_index";

export async function test_api_discussion_board_article_search_index_create_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare actor-specific connection as admin to create prerequisites
  const adminConnection: api.IConnection = { host: connection.host };
  // No authentication required for creation API as per description, so using base directly for article creation
  // Since IDiscussionBoardArticleSearchIndex.ICreate has empty schema, we cannot create from it directly.
  // Instead, we must create a discussion_board_article to get an article ID for referential integrity.
  // But no API functions or DTOs for articles are provided, so we cannot create an article record.
  // Therefore, we will call the generate_random_discussion_board_article_search_indexes_create_article_search_index
  // with an empty body, assuming the utility handles prerequisites internally.
  // Create actor-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Use utility function to create article search index with empty ICreate body
  const output =
    await generate_random_discussion_board_article_search_indexes_create_article_search_index(
      userConnection,
      { body: {} },
    );
  // Apply typia.assert cast to any to satisfy TypeScript's property access
  const safeOutput = typia.assert(output as any) satisfies any as any;
  // Validate each expected property exists properly
  // id must be UUID string
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      safeOutput.id,
    ),
  );
  // discussion_board_article_id must be string with non-empty (database integrity)
  TestValidator.predicate(
    "discussion_board_article_id exists",
    typeof safeOutput.discussion_board_article_id === "string" &&
      safeOutput.discussion_board_article_id.length > 0,
  );
  // title must be string
  TestValidator.predicate("title is string", typeof safeOutput.title === "string");
  // body must be string
  TestValidator.predicate("body is string", typeof safeOutput.body === "string");
  // created_at and updated_at are ISO string timestamps
  TestValidator.predicate(
    "created_at ISO string",
    typeof safeOutput.created_at === "string" &&
      !isNaN(Date.parse(safeOutput.created_at)),
  );
  TestValidator.predicate(
    "updated_at ISO string",
    typeof safeOutput.updated_at === "string" &&
      !isNaN(Date.parse(safeOutput.updated_at)),
  );
  // deleted_at must be null on creation
  TestValidator.equals("deleted_at is null", safeOutput.deleted_at, null);
}
