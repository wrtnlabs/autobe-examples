import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_customer_address } from "../prepare/prepare_random_ecommerce_customer_address";

export async function generate_random_ecommerce_customer_me_addresses_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceCustomerAddress.ICreate> | undefined;
  },
): Promise<IEcommerceCustomerAddress> {
  const prepared: IEcommerceCustomerAddress.ICreate =
    prepare_random_ecommerce_customer_address(props.body);
  const result: IEcommerceCustomerAddress =
    await api.functional.ecommerce.customer.me.addresses.create(connection, {
      body: prepared,
    });
  return result;
}
