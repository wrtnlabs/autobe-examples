import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_address } from "../prepare/prepare_random_ecommerce_mall_address";

export async function generate_random_ecommerce_mall_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAddress.ICreate> | undefined;
  },
): Promise<IEcommerceMallAddress> {
  const prepared: IEcommerceMallAddress.ICreate =
    prepare_random_ecommerce_mall_address(props.body);
  return await api.functional.ecommerceMall.customer.addresses.create(
    connection,
    {
      body: prepared,
    },
  );
}
