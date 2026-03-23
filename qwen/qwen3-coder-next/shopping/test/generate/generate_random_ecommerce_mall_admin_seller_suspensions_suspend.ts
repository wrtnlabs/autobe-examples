import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_seller_suspension } from "../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function generate_random_ecommerce_mall_admin_seller_suspensions_suspend(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallSellerSuspension.ICreate> | undefined;
  },
): Promise<IEcommerceMallSellerSuspension> {
  const prepared: IEcommerceMallSellerSuspension.ICreate =
    prepare_random_ecommerce_mall_seller_suspension(props.body);
  return await api.functional.ecommerceMall.admin.seller_suspensions.suspend(
    connection,
    {
      body: prepared,
    },
  );
}
