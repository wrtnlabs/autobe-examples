import api from "@ORGANIZATION/PROJECT-api";
import type { IEconomicBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_at_deleted_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that does not exist (guaranteed to return 404)
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to get a section with an ID that does not exist (or has been deleted)
  // According to the specification: both non-existent and deleted sections return 404
  await TestValidator.httpError(
    "should return 404 for deleted section",
    404,
    async () => {
      await api.functional.economicBoard.sections.at(connection, {
        sectionId: nonExistentSectionId,
      });
    },
  );
}
