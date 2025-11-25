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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminDisputesDisputeIdMessages(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDisputeMessage.IRequest;
}): Promise<IPageIShoppingMallDisputeMessage.ISummary> {
  // Validate the dispute exists
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId, deleted_at: null },
    include: {
      customer: true,
      seller: true,
      admin: true,
    },
  });
  if (!dispute) {
    throw new HttpException("Dispute not found", 404);
  }
  // Only allow if admin is the assigned admin or has platform-wide privilege (implicit in handler)
  // (This check is implicit because only platform admins can use this API)

  // Compose message where filter
  const where = {
    shopping_mall_dispute_id: props.disputeId,
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
    ...(props.body.role && { role: props.body.role }),
    ...(props.body.content_contains && {
      content: { contains: props.body.content_contains },
    }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: props.body.created_at_from,
            }),
            ...(props.body.created_at_to && { lte: props.body.created_at_to }),
          },
        }
      : {}),
    deleted_at: null, // Only retrieve non-deleted messages
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Sorting
  let orderBy: { [key: string]: "asc" | "desc" } = { created_at: "desc" };
  if (props.body.sort_by) {
    orderBy = {
      [props.body.sort_by]:
        props.body.order ??
        (props.body.sort_by === "created_at" ? "desc" : "asc"),
    };
  }
  // Retrieve messages and total count in parallel
  const [messages, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_dispute_messages.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        senderAdmin: true,
        senderSeller: true,
        senderCustomer: true,
        receiverAdmin: true,
        receiverSeller: true,
        receiverCustomer: true,
        dispute: {
          include: {
            customer: true,
            seller: true,
            admin: true,
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_dispute_messages.count({ where }),
  ]);
  // Map message to summary DTO
  const data = messages.map((message) => ({
    id: message.id,
    dispute: {
      id: message.dispute.id,
      status: message.dispute.status,
      subject: message.dispute.subject,
      root_cause: message.dispute.root_cause,
      resolution_note: message.dispute.resolution_note ?? undefined,
      customer: {
        id: message.dispute.customer.id,
        name: message.dispute.customer.name,
      },
      seller: {
        id: message.dispute.seller.id,
        business_name: message.dispute.seller.business_name,
      },
      admin: message.dispute.admin
        ? {
            id: message.dispute.admin.id,
            name: message.dispute.admin.name,
            email: message.dispute.admin.email,
          }
        : undefined,
      created_at: toISOStringSafe(message.dispute.created_at),
      updated_at: toISOStringSafe(message.dispute.updated_at),
      deleted_at: message.dispute.deleted_at
        ? toISOStringSafe(message.dispute.deleted_at)
        : undefined,
    },
    role: message.role,
    content: message.content,
    sender_admin: message.senderAdmin
      ? {
          id: message.senderAdmin.id,
          name: message.senderAdmin.name,
          email: message.senderAdmin.email,
        }
      : undefined,
    sender_seller: message.senderSeller
      ? {
          id: message.senderSeller.id,
          business_name: message.senderSeller.business_name,
        }
      : undefined,
    sender_customer: message.senderCustomer
      ? {
          id: message.senderCustomer.id,
          name: message.senderCustomer.name,
        }
      : undefined,
    receiver_admin: message.receiverAdmin
      ? {
          id: message.receiverAdmin.id,
          name: message.receiverAdmin.name,
          email: message.receiverAdmin.email,
        }
      : undefined,
    receiver_seller: message.receiverSeller
      ? {
          id: message.receiverSeller.id,
          business_name: message.receiverSeller.business_name,
        }
      : undefined,
    receiver_customer: message.receiverCustomer
      ? {
          id: message.receiverCustomer.id,
          name: message.receiverCustomer.name,
        }
      : undefined,
    created_at: toISOStringSafe(message.created_at),
    deleted_at: message.deleted_at
      ? toISOStringSafe(message.deleted_at)
      : undefined,
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
