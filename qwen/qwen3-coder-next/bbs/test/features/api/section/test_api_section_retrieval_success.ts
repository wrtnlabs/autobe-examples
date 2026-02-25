import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test successful retrieval of an existing discussion board section.
 * This test creates a section with name and description, then retrieves it
 * using the sectionId to verify all section properties are correctly returned.
 */
export async function test_api_section_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for testing
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the section by ID
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    connection,
    {
      sectionId: sectionId,
    },
  );
  // Validate the retrieved section
  typia.assert(retrievedSection);
  // Verify section properties exist and have correct types
  TestValidator.predicate(
    "section has valid UUID",
    /^[0-9a-f-]{36}$/i.test(retrievedSection.id),
  );
  TestValidator.predicate(
    "section has name",
    typeof retrievedSection.name === "string" &&
      retrievedSection.name.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO string",
    typeof retrievedSection.created_at === "string" &&
      !isNaN(Date.parse(retrievedSection.created_at)),
  );
}
