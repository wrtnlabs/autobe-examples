import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeMessage";
import { IPageIShoppingMallDisputeMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallDisputeMessage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerDisputesDisputeIdMessages(props: {
  seller: SellerPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IRequest;
}): Promise<IPageIShoppingMallDisputeMessage.ISummary> {
  // 1. Fetch dispute and verify access
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId },
  });
  if (!dispute) {
    throw new HttpException("Dispute not found", 404);
  }
  if (dispute.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Set up filtering
  const filters: Record<string, unknown> = {
    shopping_mall_dispute_id: props.disputeId,
    deleted_at: null,
  };
  if (props.body.sender_admin_id != null)
    filters.shopping_mall_sender_admin_id = props.body.sender_admin_id;
  if (props.body.sender_seller_id != null)
    filters.shopping_mall_sender_seller_id = props.body.sender_seller_id;
  if (props.body.sender_customer_id != null)
    filters.shopping_mall_sender_customer_id = props.body.sender_customer_id;
  if (props.body.receiver_admin_id != null)
    filters.shopping_mall_receiver_admin_id = props.body.receiver_admin_id;
  if (props.body.receiver_seller_id != null)
    filters.shopping_mall_receiver_seller_id = props.body.receiver_seller_id;
  if (props.body.receiver_customer_id != null)
    filters.shopping_mall_receiver_customer_id =
      props.body.receiver_customer_id;
  if (props.body.role != null) filters.role = props.body.role;
  if (props.body.content_contains != null)
    filters.content = { contains: props.body.content_contains };
  if (props.body.created_at_from != null || props.body.created_at_to != null) {
    (filters.created_at as any) = {};
    if (props.body.created_at_from != null)
      (filters.created_at as any).gte = props.body.created_at_from;
    if (props.body.created_at_to != null)
      (filters.created_at as any).lte = props.body.created_at_to;
  }
  // 3. Pagination
  const page = props.body.page != null ? props.body.page : 1;
  const limit = props.body.limit != null ? props.body.limit : 100;
  const skip = (page - 1) * limit;
  // 4. Sorting
  const sortBy = props.body.sort_by ?? "created_at";
  const order = props.body.order ?? "desc";
  // 5. Fetch messages and count
  const [messages, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_dispute_messages.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
    }),
    MyGlobal.prisma.shopping_mall_dispute_messages.count({ where: filters }),
  ]);
  // 6. Fetch dispute party summaries and message ref summaries
  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: dispute.shopping_mall_seller_id },
  });
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: dispute.shopping_mall_customer_id },
  });
  const admin = dispute.shopping_mall_admin_id
    ? await MyGlobal.prisma.shopping_mall_admins.findUnique({
        where: { id: dispute.shopping_mall_admin_id },
      })
    : null;

  // Compose dispute summary, applying null-checks
  const disputeSummary: IShoppingMallDispute.ISummary = {
    id: dispute.id,
    status: dispute.status,
    subject: dispute.subject,
    root_cause: dispute.root_cause,
    resolution_note: dispute.resolution_note ?? null,
    customer: customer
      ? { id: customer.id, name: customer.name }
      : { id: "", name: "" },
    seller: seller
      ? { id: seller.id, business_name: seller.business_name }
      : { id: "", business_name: "" },
    admin: admin
      ? { id: admin.id, name: admin.name, email: admin.email }
      : null,
    created_at: toISOStringSafe(dispute.created_at),
    updated_at: toISOStringSafe(dispute.updated_at),
    deleted_at: dispute.deleted_at ? toISOStringSafe(dispute.deleted_at) : null,
  };
  // Preload maps for referenced actors
  const adminIds = Array.from(
    new Set([
      ...messages
        .map((m) => m.shopping_mall_sender_admin_id)
        .filter((id): id is string => id != null),
      ...messages
        .map((m) => m.shopping_mall_receiver_admin_id)
        .filter((id): id is string => id != null),
    ]),
  );
  const sellerIds = Array.from(
    new Set([
      ...messages
        .map((m) => m.shopping_mall_sender_seller_id)
        .filter((id): id is string => id != null),
      ...messages
        .map((m) => m.shopping_mall_receiver_seller_id)
        .filter((id): id is string => id != null),
    ]),
  );
  const customerIds = Array.from(
    new Set([
      ...messages
        .map((m) => m.shopping_mall_sender_customer_id)
        .filter((id): id is string => id != null),
      ...messages
        .map((m) => m.shopping_mall_receiver_customer_id)
        .filter((id): id is string => id != null),
    ]),
  );
  const [adminRecords, sellerRecords, customerRecords] = await Promise.all([
    adminIds.length > 0
      ? MyGlobal.prisma.shopping_mall_admins.findMany({
          where: { id: { in: adminIds } },
        })
      : Promise.resolve([]),
    sellerIds.length > 0
      ? MyGlobal.prisma.shopping_mall_sellers.findMany({
          where: { id: { in: sellerIds } },
        })
      : Promise.resolve([]),
    customerIds.length > 0
      ? MyGlobal.prisma.shopping_mall_customers.findMany({
          where: { id: { in: customerIds } },
        })
      : Promise.resolve([]),
  ]);
  const adminMap = Object.fromEntries(
    adminRecords.map((a) => [a.id, { id: a.id, name: a.name, email: a.email }]),
  );
  const sellerMap = Object.fromEntries(
    sellerRecords.map((s) => [
      s.id,
      { id: s.id, business_name: s.business_name },
    ]),
  );
  const customerMap = Object.fromEntries(
    customerRecords.map((c) => [c.id, { id: c.id, name: c.name }]),
  );
  // Compose summary entries
  const data = messages.map((msg) => ({
    id: msg.id,
    dispute: disputeSummary,
    role: msg.role,
    content: msg.content,
    sender_admin: msg.shopping_mall_sender_admin_id
      ? (adminMap[msg.shopping_mall_sender_admin_id] ?? null)
      : undefined,
    sender_seller: msg.shopping_mall_sender_seller_id
      ? (sellerMap[msg.shopping_mall_sender_seller_id] ?? null)
      : undefined,
    sender_customer: msg.shopping_mall_sender_customer_id
      ? (customerMap[msg.shopping_mall_sender_customer_id] ?? null)
      : undefined,
    receiver_admin: msg.shopping_mall_receiver_admin_id
      ? (adminMap[msg.shopping_mall_receiver_admin_id] ?? null)
      : undefined,
    receiver_seller: msg.shopping_mall_receiver_seller_id
      ? (sellerMap[msg.shopping_mall_receiver_seller_id] ?? null)
      : undefined,
    receiver_customer: msg.shopping_mall_receiver_customer_id
      ? (customerMap[msg.shopping_mall_receiver_customer_id] ?? null)
      : undefined,
    created_at: toISOStringSafe(msg.created_at),
    deleted_at: msg.deleted_at ? toISOStringSafe(msg.deleted_at) : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
