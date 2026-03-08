import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_retrieval_by_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID for the section ID
  const sectionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Call the API to retrieve the section
  const section: IDiscussionBoardSection =
    await api.functional.discussionBoard.sections.at(connection, { sectionId });
  // Validate the response structure with typia
  typia.assert(section);
  // Validate business logic: articles_count should be non-negative
  TestValidator.predicate(
    "articles_count is non-negative",
    section.articles_count >= 0,
  );
  // Validate creator information exists (business logic, not type validation)
  TestValidator.predicate(
    "creator has valid grade",
    section.creator.grade === "regular" || section.creator.grade === "super",
  );
}
