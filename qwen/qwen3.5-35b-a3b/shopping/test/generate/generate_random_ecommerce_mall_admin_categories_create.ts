import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_category } from "../prepare/prepare_random_ecommerce_mall_category";

export async function generate_random_ecommerce_mall_admin_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCategory.ICreate> | undefined;
  },
): Promise<IEcommerceMallCategory> {
  const prepared: IEcommerceMallCategory.ICreate =
    prepare_random_ecommerce_mall_category(props.body);
  const result: IEcommerceMallCategory =
    await api.functional.ecommerceMall.admin.categories.create(connection, {
      body: prepared,
    });
  return result;
}
