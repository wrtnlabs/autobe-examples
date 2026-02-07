import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_email_verification } from "../prepare/prepare_random_shopping_mall_customer_email_verification";

export async function generate_random_shopping_mall_customer_email_verifications_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IShoppingMallCustomerEmailVerification.ICreate>
      | undefined;
  },
): Promise<IShoppingMallCustomerEmailVerification> {
  const prepared: IShoppingMallCustomerEmailVerification.ICreate =
    prepare_random_shopping_mall_customer_email_verification(props.body);
  return await api.functional.shoppingMall.customer.email_verifications.create(
    connection,
    {
      body: prepared,
    },
  );
}
