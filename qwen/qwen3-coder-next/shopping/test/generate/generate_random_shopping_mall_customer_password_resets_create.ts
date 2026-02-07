import api from "@ORGANIZATION/PROJECT-api";
import type { IAutoBeSuccess } from "@ORGANIZATION/PROJECT-api/lib/structures/IAutoBeSuccess";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_customer_password_reset } from "../prepare/prepare_random_shopping_mall_customer_password_reset";

export async function generate_random_shopping_mall_customer_password_resets_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallCustomerPasswordReset.ICreate> | undefined;
  },
): Promise<IAutoBeSuccess.IResponse> {
  const prepared: IShoppingMallCustomerPasswordReset.ICreate =
    prepare_random_shopping_mall_customer_password_reset(props.body);
  return await api.functional.shoppingMall.customer.password_resets.create(
    connection,
    {
      body: prepared,
    },
  );
}
