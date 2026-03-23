import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductDeletion";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_deletion } from "../prepare/prepare_random_ecommerce_mall_product_deletion";

export async function generate_random_ecommerce_mall_admin_product_deletions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductDeletion.ICreate> | undefined;
  },
): Promise<IEcommerceMallProductDeletion> {
  const prepared: IEcommerceMallProductDeletion.ICreate =
    prepare_random_ecommerce_mall_product_deletion(props.body);
  return await api.functional.ecommerceMall.admin.product_deletions.create(
    connection,
    {
      body: prepared,
    },
  );
}
