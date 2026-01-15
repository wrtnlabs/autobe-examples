import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSection";
export async function test_api_category_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random category code string
  const categoryCode: string = typia.random<string>();
  // Retrieve the category using its code identifier
  const retrievedCategory: ICommunityPlatformSection =
    await api.functional.communityPlatform.categories.at(connection, {
      categoryCode,
    });
  // Validate that the returned value is a string (ICommunityPlatformSection)
  typia.assert(retrievedCategory);
  // Since ICommunityPlatformSection is just a string type, we can compare the code
  // We don't have properties to validate as the type is string
  TestValidator.equals(
    "retrieved category code matches",
    retrievedCategory,
    categoryCode,
  );
}
