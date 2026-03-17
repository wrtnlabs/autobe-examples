import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdminAdminRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IReview;
}): Promise<IShoppingMallCancellationRequest> {
  // 1. Fetch the AdminRequest record by requestId — throws 404 if not found
  const existing =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          reason: true,
          shopping_mall_order_item_id: true,
        },
      },
    );
  // 2. Validate current status is 'pending' — reject if already reviewed
  if (existing.status !== "pending") {
    throw new HttpException(
      "This admin request has already been reviewed and cannot be modified.",
      422,
    );
  }
  const now = new Date();
  // 3. Execute transaction: update status + create snapshot + conditionally create admin records
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 3a. Update the request's status and updated_at timestamp
    await tx.shopping_mall_cancellation_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        updated_at: now,
      },
    });
    // 3b. Create an immutable snapshot record for the audit trail
    await tx.shopping_mall_cancellation_request_snapshots.create({
      data: {
        id: v4(),
        cancellationRequest: { connect: { id: props.requestId } },
        status: props.body.status,
        reason: existing.reason,
        created_at: now,
      },
    });
    // 3c. If approved, promote the applicant's customer account to admin
    if (props.body.status === "approved") {
      const orderItem = await tx.shopping_mall_order_items.findUnique({
        where: { id: existing.shopping_mall_order_item_id },
        select: { shopping_mall_order_id: true },
      });
      if (orderItem !== null) {
        const order = await tx.shopping_mall_orders.findUnique({
          where: { id: orderItem.shopping_mall_order_id },
          select: { shopping_mall_customer_id: true },
        });
        if (order !== null) {
          const customer = await tx.shopping_mall_customers.findUnique({
            where: { id: order.shopping_mall_customer_id },
            select: { id: true, email: true, password_hash: true },
          });
          if (customer !== null) {
            // Ensure admin record does not already exist for this customer
            const existingAdminLink =
              await tx.shopping_mall_admin_of_customers.findUnique({
                where: { customer_id: customer.id },
                select: { id: true },
              });
            if (existingAdminLink === null) {
              const newAdminId = v4();
              await tx.shopping_mall_admins.create({
                data: {
                  id: newAdminId,
                  actor_type: "customer",
                  email: customer.email,
                  password_hash: customer.password_hash,
                  created_at: now,
                  updated_at: now,
                  deleted_at: null,
                },
              });
              await tx.shopping_mall_admin_of_customers.create({
                data: {
                  id: v4(),
                  admin: { connect: { id: newAdminId } },
                  customer: { connect: { id: customer.id } },
                  created_at: now,
                },
              });
            }
          }
        }
      }
    }
  });
  // 4. Re-fetch the updated record with full transformer select and return
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return ShoppingMallCancellationRequestTransformer.transform(updated);
}
