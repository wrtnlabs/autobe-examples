import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
export async function test_api_section_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random section code that follows the schema requirements (3-50 chars)
  const sectionCode = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  // Call the API endpoint to retrieve the section by its code
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.sections.at(connection, {
      sectionCode: sectionCode,
    });
  // Validate the response matches the IShoppingMallSection schema exactly
  typia.assert(section);
  // Verify the returned section code matches the requested code (business logic validation)
  TestValidator.equals(
    "section code matches requested code",
    section.code,
    sectionCode,
  );
}
