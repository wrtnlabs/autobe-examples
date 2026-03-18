import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_payment } from "../prepare/prepare_random_shopping_mall_payment";

export async function generate_random_shopping_mall_member_payments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPayment.ICreate> | undefined;
  },
): Promise<IShoppingMallPayment> {
  const prepared: IShoppingMallPayment.ICreate =
    prepare_random_shopping_mall_payment(props.body);
  return await api.functional.shoppingMall.member.payments.create(connection, {
    body: prepared,
  });
}
