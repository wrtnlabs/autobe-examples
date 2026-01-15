import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPaymentWebhook } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhook";
import { IShoppingMallPaymentWebhookPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookPayload";
import { IShoppingMallPaymentWebhookCardPayload } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookCardPayload";
import { IShoppingMallPaymentWebhookMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentWebhookMetadata";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPaymentWebhookCollector {
  export async function collect(props: {
    body: IShoppingMallPaymentWebhook.ICreate;
  }) {
    return {
      id: props.body.event_id,
      url: "",
      event_types: props.body.event_type,
      status: "pending",
      delivery_count: Number(props.body.amount),
      last_delivery_at: null,
      last_failure_reason: null,
      created_at: new Date(props.body.timestamp),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_payment_webhooksCreateInput;
  }
}
