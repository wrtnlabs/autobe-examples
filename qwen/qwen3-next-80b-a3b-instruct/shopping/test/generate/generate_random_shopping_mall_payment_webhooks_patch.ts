import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import type { IShoppingMallPaymentWebhookCardPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookCardPayload";
import type { IShoppingMallPaymentWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookMetadata";
import type { IShoppingMallPaymentWebhookPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookPayload";
import { prepare_random_shopping_mall_payment_webhook } from "../prepare/prepare_random_shopping_mall_payment_webhook";
export async function generate_random_shopping_mall_payment_webhooks_patch(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallPaymentWebhook.ICreate> | undefined;
  },
): Promise<void> {
  const prepared: IShoppingMallPaymentWebhook.ICreate =
    prepare_random_shopping_mall_payment_webhook(props.body);
  return await api.functional.shoppingMall.payment_webhooks.patch(connection, {
    body: prepared,
  });
}
