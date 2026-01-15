import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDispute";
import type { IShoppingMallPaymentDisputeEvidence } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentDisputeEvidence";
import { prepare_random_shopping_mall_payment_dispute } from "../prepare/prepare_random_shopping_mall_payment_dispute";
export async function generate_random_shopping_mall_admin_payment_disputes_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentDispute.ICreate>;
  },
): Promise<IShoppingMallPaymentDispute> {
  const prepared: IShoppingMallPaymentDispute.ICreate =
    prepare_random_shopping_mall_payment_dispute(props.body);
  const result: IShoppingMallPaymentDispute =
    await api.functional.shoppingMall.admin.payment_disputes.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
