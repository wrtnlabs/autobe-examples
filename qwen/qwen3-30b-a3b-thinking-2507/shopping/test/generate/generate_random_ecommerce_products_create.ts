import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product } from "../prepare/prepare_random_ecommerce_product";

export async function generate_random_ecommerce_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProduct.ICreate> | undefined;
  },
): Promise<IEcommerceProduct> {
  const prepared: IEcommerceProduct.ICreate = prepare_random_ecommerce_product(
    props.body,
  );
  const result: IEcommerceProduct =
    await api.functional.ecommerce.products.create(connection, {
      body: prepared,
    });
  return result;
}
