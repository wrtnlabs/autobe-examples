import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallMileageTransactionsShoppingMallMileageTransactionId(props: {
  admin: AdminPayload;
  shoppingMallMileageTransactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMileageTransaction> {
  const mileageTransaction =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.findUnique({
      where: { id: props.shoppingMallMileageTransactionId },
      include: {
        shopping_mall_customer: true,
        shopping_mall_order: {
          include: {
            shopping_mall_customer: true,
            shopping_mall_seller: true,
          },
        },
      },
    });

  if (mileageTransaction === null) {
    throw new HttpException("Mileage transaction not found", 404);
  }

  return {
    id: mileageTransaction.id satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">,
    transaction_type: mileageTransaction.type satisfies string as string,
    points: mileageTransaction.amount satisfies number as number,
    description: mileageTransaction.memo ?? "",
    status: mileageTransaction.type,
    created_at: toISOStringSafe(mileageTransaction.created_at),
    updated_at:
      mileageTransaction.updated_at === null
        ? null
        : toISOStringSafe(mileageTransaction.updated_at),
    customer: {
      id: mileageTransaction.shopping_mall_customer.id satisfies string &
        tags.Format<"uuid"> as string & tags.Format<"uuid">,
      email: mileageTransaction.shopping_mall_customer
        .email satisfies string as string,
      name: mileageTransaction.shopping_mall_customer
        .name satisfies string as string,
      status: mileageTransaction.shopping_mall_customer
        .status satisfies string as string,
      created_at: toISOStringSafe(
        mileageTransaction.shopping_mall_customer.created_at,
      ),
      updated_at:
        mileageTransaction.shopping_mall_customer.updated_at === null
          ? undefined
          : toISOStringSafe(
              mileageTransaction.shopping_mall_customer.updated_at,
            ),
    },
    order:
      mileageTransaction.shopping_mall_order === null
        ? undefined
        : {
            id: mileageTransaction.shopping_mall_order.id satisfies string &
              tags.Format<"uuid"> as string & tags.Format<"uuid">,
            order_number: mileageTransaction.shopping_mall_order
              .order_number satisfies string as string,
            status: mileageTransaction.shopping_mall_order
              .status satisfies string as string,
            total_amount: mileageTransaction.shopping_mall_order
              .total_amount satisfies number as number,
            created_at: toISOStringSafe(
              mileageTransaction.shopping_mall_order.created_at,
            ),
            updated_at:
              mileageTransaction.shopping_mall_order.updated_at === null
                ? null
                : toISOStringSafe(
                    mileageTransaction.shopping_mall_order.updated_at,
                  ),
            customer: {
              id: mileageTransaction.shopping_mall_order.shopping_mall_customer
                .id satisfies string & tags.Format<"uuid"> as string &
                tags.Format<"uuid">,
              email: mileageTransaction.shopping_mall_order
                .shopping_mall_customer.email satisfies string as string,
              name: mileageTransaction.shopping_mall_order
                .shopping_mall_customer.name satisfies string as string,
              status: mileageTransaction.shopping_mall_order
                .shopping_mall_customer.status satisfies string as string,
              created_at: toISOStringSafe(
                mileageTransaction.shopping_mall_order.shopping_mall_customer
                  .created_at,
              ),
              updated_at:
                mileageTransaction.shopping_mall_order.shopping_mall_customer
                  .updated_at === null
                  ? undefined
                  : toISOStringSafe(
                      mileageTransaction.shopping_mall_order
                        .shopping_mall_customer.updated_at,
                    ),
            },
            seller: {
              id: mileageTransaction.shopping_mall_order.shopping_mall_seller
                .id satisfies string & tags.Format<"uuid"> as string &
                tags.Format<"uuid">,
              name: mileageTransaction.shopping_mall_order.shopping_mall_seller
                .name satisfies string as string,
              email: mileageTransaction.shopping_mall_order.shopping_mall_seller
                .email satisfies string as string,
              status: typia.assert<"active" | "inactive" | "suspended">(
                mileageTransaction.shopping_mall_order.shopping_mall_seller
                  .status,
              ),
              business_status: typia.assert<
                "approved" | "pending" | "rejected"
              >(
                mileageTransaction.shopping_mall_order.shopping_mall_seller
                  .business_status,
              ),
              created_at: toISOStringSafe(
                mileageTransaction.shopping_mall_order.shopping_mall_seller
                  .created_at,
              ),
              updated_at: toISOStringSafe(
                mileageTransaction.shopping_mall_order.shopping_mall_seller
                  .updated_at,
              ),
              deleted_at:
                mileageTransaction.shopping_mall_order.shopping_mall_seller
                  .deleted_at === null
                  ? null
                  : toISOStringSafe(
                      mileageTransaction.shopping_mall_order
                        .shopping_mall_seller.deleted_at,
                    ),
            },
          },
  };
}
