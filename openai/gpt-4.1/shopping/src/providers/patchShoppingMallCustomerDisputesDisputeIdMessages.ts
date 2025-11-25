import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerDisputesDisputeIdMessages(props: {
  customer: CustomerPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IRequest;
}): Promise<IPageIShoppingMallDisputeMessage.ISummary> {
  // 1. Authorization: Confirm dispute exists and is associated to customer
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId, deleted_at: null },
    include: {
      customer: true,
      seller: true,
      admin: true,
    },
  });
  if (!dispute) throw new HttpException("Dispute not found", 404);
  if (dispute.shopping_mall_customer_id !== props.customer.id)
    throw new HttpException("Forbidden", 403);

  // 2. Where conditions from body
  const where: Record<string, unknown> = {
    shopping_mall_dispute_id: props.disputeId,
    deleted_at: null,
    ...(props.body.role && { role: props.body.role }),
    ...(props.body.sender_admin_id && {
      shopping_mall_sender_admin_id: props.body.sender_admin_id,
    }),
    ...(props.body.sender_seller_id && {
      shopping_mall_sender_seller_id: props.body.sender_seller_id,
    }),
    ...(props.body.sender_customer_id && {
      shopping_mall_sender_customer_id: props.body.sender_customer_id,
    }),
    ...(props.body.receiver_admin_id && {
      shopping_mall_receiver_admin_id: props.body.receiver_admin_id,
    }),
    ...(props.body.receiver_seller_id && {
      shopping_mall_receiver_seller_id: props.body.receiver_seller_id,
    }),
    ...(props.body.receiver_customer_id && {
      shopping_mall_receiver_customer_id: props.body.receiver_customer_id,
    }),
    ...(props.body.content_contains !== undefined &&
      props.body.content_contains !== null &&
      props.body.content_contains !== "" && {
        content: { contains: props.body.content_contains },
      }),
    ...(props.body.created_at_from && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        ...(props.body.created_at_from
          ? { gte: props.body.created_at_from }
          : {}),
        lte: props.body.created_at_to,
      },
    }),
  };

  // Build created_at filter for date ranges
  if (
    (props.body.created_at_from || props.body.created_at_to) &&
    !(props.body.created_at_from && props.body.created_at_to)
  ) {
    if (props.body.created_at_from) {
      where.created_at = { gte: props.body.created_at_from };
    } else if (props.body.created_at_to) {
      where.created_at = { lte: props.body.created_at_to };
    }
  } else if (props.body.created_at_from && props.body.created_at_to) {
    where.created_at = {
      gte: props.body.created_at_from,
      lte: props.body.created_at_to,
    };
  }

  // 3. Sorting
  let orderBy: Record<string, "asc" | "desc">[];
  if (props.body.sort_by === "role") {
    orderBy = [{ role: props.body.order || "asc" }];
  } else {
    orderBy = [{ created_at: props.body.order || "desc" }];
  }

  // 4. Pagination
  const page = props.body.page && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 && props.body.limit <= 100
      ? props.body.limit
      : 100;
  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_dispute_messages.findMany({
      where,
      orderBy,
      include: {
        senderAdmin: true,
        senderSeller: true,
        senderCustomer: true,
        receiverAdmin: true,
        receiverSeller: true,
        receiverCustomer: true,
      },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_dispute_messages.count({ where }),
  ]);

  const mapAdminSummary = (admin: any) =>
    admin
      ? ({
          id: admin.id,
          name: admin.name,
          email: admin.email,
        } satisfies IShoppingMallAdmin.ISummary)
      : ({ id: "", name: "", email: "" } satisfies IShoppingMallAdmin.ISummary);
  const mapSellerSummary = (seller: any) =>
    seller
      ? ({
          id: seller.id,
          business_name: seller.business_name,
        } satisfies IShoppingMallSeller.ISummary)
      : ({ id: "", business_name: "" } satisfies IShoppingMallSeller.ISummary);
  const mapCustomerSummary = (customer: any) =>
    customer
      ? ({
          id: customer.id,
          name: customer.name,
        } satisfies IShoppingMallCustomer.ISummary)
      : ({ id: "", name: "" } satisfies IShoppingMallCustomer.ISummary);

  const messageSummaries = messages.map((msg) => ({
    id: msg.id,
    dispute: {
      id: dispute.id,
      status: dispute.status,
      subject: dispute.subject,
      root_cause: dispute.root_cause,
      resolution_note: dispute.resolution_note ?? null,
      customer: mapCustomerSummary(dispute.customer),
      seller: mapSellerSummary(dispute.seller),
      admin: mapAdminSummary(dispute.admin),
      created_at: toISOStringSafe(dispute.created_at),
      updated_at: toISOStringSafe(dispute.updated_at),
      deleted_at: dispute.deleted_at
        ? toISOStringSafe(dispute.deleted_at)
        : null,
    },
    role: msg.role,
    content: msg.content,
    sender_admin: mapAdminSummary(msg.senderAdmin),
    sender_seller: mapSellerSummary(msg.senderSeller),
    sender_customer: mapCustomerSummary(msg.senderCustomer),
    receiver_admin: mapAdminSummary(msg.receiverAdmin),
    receiver_seller: mapSellerSummary(msg.receiverSeller),
    receiver_customer: mapCustomerSummary(msg.receiverCustomer),
    created_at: toISOStringSafe(msg.created_at),
    deleted_at: msg.deleted_at ? toISOStringSafe(msg.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: messageSummaries,
  };
}
