import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_category } from "../prepare/prepare_random_ecommerce_category";

export async function generate_random_ecommerce_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCategory.ICreate> | undefined;
  },
): Promise<IEcommerceCategory> {
  const prepared: IEcommerceCategory.ICreate =
    prepare_random_ecommerce_category(props.body);
  return await api.functional.ecommerce.categories.create(connection, {
    body: prepared,
  });
}
