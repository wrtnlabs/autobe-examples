import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerCommunicationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLog";
import { IShoppingMallSellerCommunicationLogMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerCommunicationLogMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerCommunicationLogTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_communication_logsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        subject: true,
        body: true,
        sender_type: true,
        recipient_type: true,
        is_read: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        seller: true,
      },
    } satisfies Prisma.shopping_mall_seller_communication_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerCommunicationLog> {
    // Map recipient_type to admin_id: recipient_type indicates who sent the communication
    // - 'admin' means admin sent message
    // - 'seller' means seller sent message
    // - 'system' means system sent message
    const admin_id =
      input.recipient_type === "admin" ? input.recipient_type : undefined;
    // Map sender_type to type enum
    const type = (() => {
      switch (input.sender_type) {
        case "admin":
          return "admin_response";
        case "system":
          return "system_notification";
        case "seller":
          return "seller_inquiry";
        case "support":
          return "support_ticket";
        case "compliance":
          return "compliance_alert";
        case "policy":
          return "policy_update";
        case "warning":
          return "warning";
        case "suspension":
          return "suspension_notice";
        case "appeal":
          return "appeal_response";
        default:
          return "system_notification"; // fallback
      }
    })();
    // Derive severity from sender_type
    const severity = (() => {
      // High severity for admin, compliance, policy, warning, suspension, appeal
      if (
        [
          "admin",
          "compliance",
          "policy",
          "warning",
          "suspension",
          "appeal",
        ].includes(input.sender_type)
      ) {
        return "high";
      }
      // Medium severity for system, support
      if (["system", "support"].includes(input.sender_type)) {
        return "medium";
      }
      // Low severity for seller
      if (input.sender_type === "seller") {
        return "low";
      }
      // Default
      return "medium";
    })();
    return {
      id: input.id,
      admin_id: admin_id, // Direct mapping from recipient_type
      subject: input.subject ?? undefined,
      content: input.body,
      type: type,
      status: input.deleted_at
        ? "archived"
        : input.is_read
          ? "read"
          : "pending",
      severity: severity,
      created_at: input.created_at.toISOString(),
    };
  }
}
