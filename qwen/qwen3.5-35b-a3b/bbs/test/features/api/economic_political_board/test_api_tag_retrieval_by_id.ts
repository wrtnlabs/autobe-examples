import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_tag_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random tag ID for testing
  const tagId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the tag by ID (endpoint is public, no auth required)
  const tag = await api.functional.economicPoliticalBoard.tags.at(connection, {
    tagId,
  });
  typia.assert(tag);
  // Validate the response structure
  TestValidator.equals("tag ID matches request", tag.id, tagId);
  TestValidator.predicate("tag has name", tag.name.length > 0);
  TestValidator.predicate(
    "tag has valid created_at",
    new Date(tag.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "tag has valid updated_at",
    new Date(tag.updated_at).getTime() > 0,
  );
  TestValidator.equals("tag is active", tag.deleted_at, null);
  TestValidator.predicate(
    "article count is non-negative",
    tag.article_count >= 0,
  );
}
