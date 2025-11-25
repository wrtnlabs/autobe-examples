import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerDisputesDisputeIdMessagesDisputeMessageId(props: {
  seller: SellerPayload;
  disputeId: string & tags.Format<"uuid">;
  disputeMessageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallDisputeMessage> {
  const raw = await MyGlobal.prisma.shopping_mall_dispute_messages.findFirst({
    where: {
      id: props.disputeMessageId,
      shopping_mall_dispute_id: props.disputeId,
    },
  });
  if (!raw) {
    throw new HttpException("Dispute message not found", 404);
  }
  if (raw.deleted_at !== null) {
    throw new HttpException("Message is already deleted", 400);
  }
  if (raw.shopping_mall_sender_seller_id !== props.seller.id) {
    throw new HttpException(
      "You are not permitted to delete this message",
      403,
    );
  }
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_dispute_messages.update({
    where: { id: props.disputeMessageId },
    data: { deleted_at: now },
  });

  // Helper to fetch summary or return undefined if id is null
  async function fetchAdminSummary(
    id: string | null,
  ): Promise<IShoppingMallAdmin.ISummary | undefined> {
    if (!id) return undefined;
    const admin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    return admin ?? undefined;
  }
  async function fetchSellerSummary(
    id: string | null,
  ): Promise<IShoppingMallSeller.ISummary | undefined> {
    if (!id) return undefined;
    const seller = await MyGlobal.prisma.shopping_mall_sellers.findFirst({
      where: { id },
      select: { id: true, business_name: true },
    });
    return seller ?? undefined;
  }
  async function fetchCustomerSummary(
    id: string | null,
  ): Promise<IShoppingMallCustomer.ISummary | undefined> {
    if (!id) return undefined;
    const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
      where: { id },
      select: { id: true, name: true },
    });
    return customer ?? undefined;
  }

  const [
    sender_admin,
    sender_seller,
    sender_customer,
    receiver_admin,
    receiver_seller,
    receiver_customer,
  ] = await Promise.all([
    fetchAdminSummary(raw.shopping_mall_sender_admin_id),
    fetchSellerSummary(raw.shopping_mall_sender_seller_id),
    fetchCustomerSummary(raw.shopping_mall_sender_customer_id),
    fetchAdminSummary(raw.shopping_mall_receiver_admin_id),
    fetchSellerSummary(raw.shopping_mall_receiver_seller_id),
    fetchCustomerSummary(raw.shopping_mall_receiver_customer_id),
  ]);

  return {
    id: updated.id,
    shopping_mall_dispute_id: updated.shopping_mall_dispute_id,
    sender_admin: sender_admin ?? undefined,
    sender_seller: sender_seller ?? undefined,
    sender_customer: sender_customer ?? undefined,
    receiver_admin: receiver_admin ?? undefined,
    receiver_seller: receiver_seller ?? undefined,
    receiver_customer: receiver_customer ?? undefined,
    role: updated.role,
    content: updated.content,
    created_at: toISOStringSafe(updated.created_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
