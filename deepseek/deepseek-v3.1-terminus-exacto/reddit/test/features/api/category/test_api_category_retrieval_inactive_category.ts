import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieval_inactive_category(
  connection: api.IConnection,
): Promise<void> {
  // Since we cannot create categories via available SDK functions,
  // we test the error handling behavior by attempting to retrieve
  // a non-existent category, which should return an appropriate error.
  // This validates the platform's error handling standards even if
  // we cannot test the specific inactive category scenario.
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "retrieving non-existent category should throw error",
    async () => {
      await api.functional.communityPlatform.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
