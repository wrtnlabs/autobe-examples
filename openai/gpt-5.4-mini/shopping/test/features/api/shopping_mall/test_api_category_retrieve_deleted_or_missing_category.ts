import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_retrieve_deleted_or_missing_category(
  connection: api.IConnection,
): Promise<void> {
  const categoryConnection: api.IConnection = { host: connection.host };
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleted or missing category should not be retrievable",
    404,
    async () => {
      await api.functional.shoppingMall.categories.at(categoryConnection, {
        categoryId,
      });
    },
  );
}
