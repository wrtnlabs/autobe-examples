import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_get_by_id_success(
  connection: api.IConnection,
): Promise<void> {
  const categoryId = typia.random<string>();
  const category =
    await api.functional.ecommerceMall.categories.getByCategoryid(connection, {
      categoryId: categoryId,
    });
  typia.assert(category);
}
