import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random section to get a valid section ID
  // Since there's no documented API to create sections for testing,
  // we'll use the random data generator from the SDK
  const sampleSection = api.functional.discussionBoard.sections.at.random();
  // Extract the section ID from the generated sample
  const sectionId = (sampleSection as IEntity).id;
  // Call the API to retrieve the section
  const result = await api.functional.discussionBoard.sections.at(connection, {
    sectionId: sectionId,
  });
  // Validate the response structure
  typia.assert(result);
  // Verify the returned section has the expected ID
  TestValidator.equals("section ID matches", (result as IEntity).id, sectionId);
}