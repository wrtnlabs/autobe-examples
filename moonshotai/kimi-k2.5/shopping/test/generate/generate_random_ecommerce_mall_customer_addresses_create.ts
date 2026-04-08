import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_customer } from "../prepare/prepare_random_ecommerce_mall_customer";

export async function generate_random_ecommerce_mall_customer_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallCustomer.ICreate> | undefined;
  },
): Promise<IEcommerceMallCustomer> {
  const prepared: IEcommerceMallCustomer.ICreate =
    prepare_random_ecommerce_mall_customer(props.body);
  const result: IEcommerceMallCustomer =
    await api.functional.ecommerceMall.customer.addresses.create(connection, {
      body: prepared,
    });
  return result;
}
