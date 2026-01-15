import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_retrieval_nonexistent_section(
  connection: api.IConnection,
): Promise<void> {
  // Generate a validly formatted but non-existent section code that matches IShoppingMallSection.code type
  const nonExistentSectionCode = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  // Attempt to retrieve the non-existent section
  await TestValidator.error(
    "non-existent section should return 404",
    async () => {
      await api.functional.shoppingMall.sections.at(connection, {
        sectionCode: nonExistentSectionCode,
      });
    },
  );
}
