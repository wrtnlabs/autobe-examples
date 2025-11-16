import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function postShoppingMallAdminDisputes(props: {
  admin: AdminPayload;
  body: IShoppingMallDispute.ICreate;
}): Promise<IShoppingMallDispute> {
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: props.body.shopping_mall_customer_id },
    select: { id: true, name: true },
  });
  if (!customer) throw new HttpException("Customer not found", 404);

  const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
    where: { id: props.body.shopping_mall_seller_id },
    select: { id: true, business_name: true },
  });
  if (!seller) throw new HttpException("Seller not found", 404);

  let adminSummary: IShoppingMallAdmin.ISummary | null = null;
  if (props.body.shopping_mall_admin_id != null) {
    const admin = await MyGlobal.prisma.shopping_mall_admins.findUnique({
      where: { id: props.body.shopping_mall_admin_id },
      select: { id: true, name: true, email: true },
    });
    if (!admin) throw new HttpException("Admin not found", 404);
    adminSummary = { id: admin.id, name: admin.name, email: admin.email };
  }

  let refundRequestSummary: IShoppingMallRefundRequest.ISummary | null = null;
  if (props.body.shopping_mall_refund_request_id != null) {
    const refundRequest =
      await MyGlobal.prisma.shopping_mall_refund_requests.findUnique({
        where: { id: props.body.shopping_mall_refund_request_id },
        select: {
          id: true,
          status: true,
          reason: true,
          requested_amount: true,
          approved_amount: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          shopping_mall_customer_id: true,
          shopping_mall_seller_id: true,
          shopping_mall_order_id: true,
          order: {
            select: {
              id: true,
              order_number: true,
              status: true,
              total_amount: true,
              currency: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
          customer: { select: { id: true, name: true } },
          seller: { select: { id: true, business_name: true } },
        },
      });
    if (!refundRequest)
      throw new HttpException("Refund request not found", 404);
    refundRequestSummary = {
      id: refundRequest.id,
      order: {
        id: refundRequest.order.id,
        order_number: refundRequest.order.order_number,
        status: refundRequest.order.status,
        total_amount: refundRequest.order.total_amount,
        currency: refundRequest.order.currency,
        created_at: toISOStringSafe(refundRequest.order.created_at),
        updated_at: toISOStringSafe(refundRequest.order.updated_at),
        deleted_at:
          refundRequest.order.deleted_at != null
            ? toISOStringSafe(refundRequest.order.deleted_at)
            : null,
      },
      customer: {
        id: refundRequest.customer.id,
        name: refundRequest.customer.name,
      },
      seller: {
        id: refundRequest.seller.id,
        business_name: refundRequest.seller.business_name,
      },
      status: refundRequest.status,
      reason: refundRequest.reason,
      requested_amount: refundRequest.requested_amount,
      approved_amount: refundRequest.approved_amount ?? null,
      created_at: toISOStringSafe(refundRequest.created_at),
      updated_at: toISOStringSafe(refundRequest.updated_at),
      deleted_at:
        refundRequest.deleted_at != null
          ? toISOStringSafe(refundRequest.deleted_at)
          : null,
    };
  }

  const now = toISOStringSafe(new Date());
  const disputeCreate = await MyGlobal.prisma.shopping_mall_disputes.create({
    data: {
      id: v4(),
      shopping_mall_refund_request_id:
        props.body.shopping_mall_refund_request_id ?? null,
      shopping_mall_customer_id: props.body.shopping_mall_customer_id,
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
      shopping_mall_admin_id: props.body.shopping_mall_admin_id ?? null,
      status: props.body.status,
      subject: props.body.subject,
      root_cause: props.body.root_cause,
      resolution_note: props.body.resolution_note ?? null,
      created_at: now,
      updated_at: now,
    },
  });

  const result: IShoppingMallDispute = {
    id: disputeCreate.id,
    refund_request: refundRequestSummary ?? undefined,
    customer: { id: customer.id, name: customer.name },
    seller: { id: seller.id, business_name: seller.business_name },
    admin: adminSummary ?? undefined,
    status: disputeCreate.status,
    subject: disputeCreate.subject,
    root_cause: disputeCreate.root_cause,
    resolution_note: disputeCreate.resolution_note ?? undefined,
    created_at: toISOStringSafe(disputeCreate.created_at),
    updated_at: toISOStringSafe(disputeCreate.updated_at),
    deleted_at:
      disputeCreate.deleted_at != null
        ? toISOStringSafe(disputeCreate.deleted_at)
        : undefined,
  };
  return result;
}
