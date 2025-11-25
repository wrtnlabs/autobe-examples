import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDispute";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminDisputesDisputeId(props: {
  admin: AdminPayload;
  disputeId: string & tags.Format<"uuid">;
  body: IShoppingMallDispute.IUpdate;
}): Promise<IShoppingMallDispute> {
  const dispute = await MyGlobal.prisma.shopping_mall_disputes.findUnique({
    where: { id: props.disputeId },
  });
  if (dispute === null) {
    throw new HttpException("Dispute not found", 404);
  }
  if (
    dispute.shopping_mall_admin_id !== null &&
    dispute.shopping_mall_admin_id !== props.admin.id
  ) {
    throw new HttpException(
      "Forbidden: Only the assigned admin can update this dispute",
      403,
    );
  }
  // Validate admin if assignment changes or explicit assignment requested
  if (
    props.body.shopping_mall_admin_id !== undefined &&
    props.body.shopping_mall_admin_id !== null &&
    props.body.shopping_mall_admin_id !== props.admin.id
  ) {
    const targetAdmin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: props.body.shopping_mall_admin_id },
    });
    if (
      targetAdmin === null ||
      targetAdmin.status !== "active" ||
      !targetAdmin.is_email_verified
    ) {
      throw new HttpException(
        "Target admin assignment invalid or not active",
        400,
      );
    }
  }
  if (
    props.body.shopping_mall_refund_request_id !== undefined &&
    props.body.shopping_mall_refund_request_id !== null
  ) {
    const refundCheck =
      await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
        where: { id: props.body.shopping_mall_refund_request_id },
      });
    if (refundCheck === null || refundCheck.deleted_at !== null) {
      throw new HttpException(
        "Referenced refund request not found or deleted",
        400,
      );
    }
  }
  if (
    props.body.shopping_mall_customer_id !== undefined &&
    props.body.shopping_mall_customer_id !== null
  ) {
    const customerCheck =
      await MyGlobal.prisma.shopping_mall_customers.findUnique({
        where: { id: props.body.shopping_mall_customer_id },
      });
    if (customerCheck === null) {
      throw new HttpException("Referenced customer not found", 400);
    }
  }
  if (
    props.body.shopping_mall_seller_id !== undefined &&
    props.body.shopping_mall_seller_id !== null
  ) {
    const sellerCheck = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: props.body.shopping_mall_seller_id },
    });
    if (sellerCheck === null) {
      throw new HttpException("Referenced seller not found", 400);
    }
  }
  const updated = await MyGlobal.prisma.shopping_mall_disputes.update({
    where: { id: props.disputeId },
    data: {
      shopping_mall_refund_request_id:
        props.body.shopping_mall_refund_request_id !== undefined
          ? props.body.shopping_mall_refund_request_id
          : dispute.shopping_mall_refund_request_id,
      shopping_mall_customer_id:
        props.body.shopping_mall_customer_id !== undefined
          ? props.body.shopping_mall_customer_id
          : dispute.shopping_mall_customer_id,
      shopping_mall_seller_id:
        props.body.shopping_mall_seller_id !== undefined
          ? props.body.shopping_mall_seller_id
          : dispute.shopping_mall_seller_id,
      shopping_mall_admin_id:
        props.body.shopping_mall_admin_id !== undefined
          ? props.body.shopping_mall_admin_id
          : dispute.shopping_mall_admin_id,
      status:
        props.body.status !== undefined ? props.body.status : dispute.status,
      subject:
        props.body.subject !== undefined ? props.body.subject : dispute.subject,
      root_cause:
        props.body.root_cause !== undefined
          ? props.body.root_cause
          : dispute.root_cause,
      resolution_note:
        props.body.resolution_note !== undefined
          ? props.body.resolution_note
          : dispute.resolution_note,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Fetch top entities
  const [customer, seller, admin, refund] = await Promise.all([
    MyGlobal.prisma.shopping_mall_customers.findUnique({
      where: { id: updated.shopping_mall_customer_id },
    }),
    MyGlobal.prisma.shopping_mall_sellers.findUnique({
      where: { id: updated.shopping_mall_seller_id },
    }),
    updated.shopping_mall_admin_id
      ? MyGlobal.prisma.shopping_mall_admins.findUnique({
          where: { id: updated.shopping_mall_admin_id },
        })
      : Promise.resolve(undefined),
    updated.shopping_mall_refund_request_id
      ? MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
          where: { id: updated.shopping_mall_refund_request_id },
        })
      : Promise.resolve(undefined),
  ]);
  // For refund (ISummary), its nested 'order', 'customer', 'seller' must be present if refund exists
  let refundRequest: IShoppingMallRefundRequest.ISummary | null | undefined =
    null;
  if (refund !== undefined && refund !== null) {
    // Fetch nested references
    const [orderData, refundCustomerData, refundSellerData] = await Promise.all(
      [
        refund.shopping_mall_order_id
          ? MyGlobal.prisma.shopping_mall_orders.findUnique({
              where: { id: refund.shopping_mall_order_id },
            })
          : Promise.resolve(null),
        refund.shopping_mall_customer_id
          ? MyGlobal.prisma.shopping_mall_customers.findUnique({
              where: { id: refund.shopping_mall_customer_id },
            })
          : Promise.resolve(null),
        refund.shopping_mall_seller_id
          ? MyGlobal.prisma.shopping_mall_sellers.findUnique({
              where: { id: refund.shopping_mall_seller_id },
            })
          : Promise.resolve(null),
      ],
    );
    if (orderData && refundCustomerData && refundSellerData) {
      refundRequest = {
        id: refund.id,
        order: {
          id: orderData.id,
          order_number: orderData.order_number,
          status: orderData.status,
          total_amount: orderData.total_amount,
          currency: orderData.currency,
          created_at: toISOStringSafe(orderData.created_at),
          updated_at: toISOStringSafe(orderData.updated_at),
          deleted_at:
            orderData.deleted_at === null
              ? null
              : toISOStringSafe(orderData.deleted_at),
        },
        customer: {
          id: refundCustomerData.id,
          name: refundCustomerData.name,
        },
        seller: {
          id: refundSellerData.id,
          business_name: refundSellerData.business_name,
        },
        status: refund.status,
        reason: refund.reason,
        requested_amount: refund.requested_amount,
        approved_amount: refund.approved_amount ?? null,
        created_at: toISOStringSafe(refund.created_at),
        updated_at: toISOStringSafe(refund.updated_at),
        deleted_at:
          refund.deleted_at === null
            ? null
            : toISOStringSafe(refund.deleted_at),
      };
    } else {
      refundRequest = null;
    }
  } else {
    refundRequest = undefined;
  }
  // Respond as per DTO contract
  return {
    id: updated.id,
    refund_request: refundRequest,
    customer:
      customer !== undefined && customer !== null
        ? { id: customer.id, name: customer.name }
        : { id: updated.shopping_mall_customer_id, name: "Deleted customer" },
    seller:
      seller !== undefined && seller !== null
        ? { id: seller.id, business_name: seller.business_name }
        : {
            id: updated.shopping_mall_seller_id,
            business_name: "Deleted seller",
          },
    admin:
      admin !== undefined && admin !== null
        ? { id: admin.id, name: admin.name, email: admin.email }
        : undefined,
    status: updated.status,
    subject: updated.subject,
    root_cause: updated.root_cause,
    resolution_note: updated.resolution_note ?? undefined,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
