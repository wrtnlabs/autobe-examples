import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPaymentAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLog";
import { IShoppingMallPaymentAuditLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentAuditLogMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPaymentAuditLogTransformer {
  export type Payload = Prisma.shopping_mall_payment_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        actor_type: true,
        payment_entity_type: true,
        old_value: true,
        new_value: true,
        reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: true,
        customer: true,
        seller: true,
        paymentIntent: true,
        paymentRefund: true,
      },
    } satisfies Prisma.shopping_mall_payment_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPaymentAuditLog> {
    return {
      id: input.id,
      payment_id: input.payment_entity_type,
      action_type: input.actor_type,
      status: "",
      amount: "",
      currency: "",
      gateway: "",
      gateway_response_code: "",
      gateway_response_message: "",
      actor_id: "",
      ip_address: "",
      user_agent: "",
      request_id: "",
      payment_intent_id: "",
      created_at: toISOStringSafe(input.created_at),
      processed_by: "",
      error_details:
        input.old_value + " | " + input.new_value + " | " + input.reason,
      retry_count: "",
      metadata: "",
    };
  }
}
