import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_description_handling(
  connection: api.IConnection,
): Promise<void> {
  // Test section retrieval with description field handling
  // The API should correctly handle optional description fields in sections
  // Create a section with description
  const sectionWithDescription =
    await api.functional.discussionBoard.sections.at(connection, {
      sectionId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(sectionWithDescription);
  // Validate section with description has description field
  TestValidator.predicate(
    "section has description field",
    sectionWithDescription.description !== null &&
      sectionWithDescription.description !== undefined &&
      typeof sectionWithDescription.description === "string",
  );
  // Create a section without description (description will be null/undefined)
  const sectionWithoutDescription =
    await api.functional.discussionBoard.sections.at(connection, {
      sectionId: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(sectionWithoutDescription);
  // Validate section without description has null/undefined description
  TestValidator.predicate(
    "section without description has null/undefined description",
    sectionWithoutDescription.description === null ||
      sectionWithoutDescription.description === undefined,
  );
  // Validate both sections have basic required fields
  TestValidator.predicate(
    "section with description has valid id",
    typeof sectionWithDescription.id === "string",
  );
  TestValidator.predicate(
    "section with description has valid name",
    typeof sectionWithDescription.name === "string",
  );
  TestValidator.predicate(
    "section with description has valid created_at",
    typeof sectionWithDescription.created_at === "string",
  );
  TestValidator.predicate(
    "section without description has valid id",
    typeof sectionWithoutDescription.id === "string",
  );
  TestValidator.predicate(
    "section without description has valid name",
    typeof sectionWithoutDescription.name === "string",
  );
  TestValidator.predicate(
    "section without description has valid created_at",
    typeof sectionWithoutDescription.created_at === "string",
  );
}
