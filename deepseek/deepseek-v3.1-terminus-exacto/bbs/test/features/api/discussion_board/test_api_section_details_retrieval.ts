import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random section ID
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Call the API endpoint to retrieve section details
  const section = await api.functional.discussionBoard.sections.at(connection, {
    sectionId,
  });
  // Validate the response structure matches IDiscussionBoardSection schema
  // typia.assert performs complete validation including:
  // - UUID format validation for section.id
  // - String validation for section.name
  // - Date-time format validation for created_at, updated_at, deleted_at
  // - Nullable type validation for description and deleted_at
  typia.assert(section);
}
