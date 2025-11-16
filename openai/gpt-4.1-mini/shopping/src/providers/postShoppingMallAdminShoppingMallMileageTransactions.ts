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

export async function postShoppingMallAdminShoppingMallMileageTransactions(props: {
  admin: AdminPayload;
  body: IShoppingMallMileageTransaction.ICreate;
}): Promise<IShoppingMallMileageTransaction> {
  // Find customer by code
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: {
      code: props.body.customer_code,
    } as unknown as Prisma.shopping_mall_customersWhereUniqueInput,
  });

  if (!customer) {
    throw new HttpException(
      `Customer not found: code ${props.body.customer_code}`,
      404,
    );
  }

  // Find order by code if order_code is provided
  const order = props.body.order_code
    ? await MyGlobal.prisma.shopping_mall_orders.findUnique({
        where: {
          order_number: props.body.order_code,
        } as Prisma.shopping_mall_ordersWhereUniqueInput,
      })
    : null;

  if (props.body.order_code && !order) {
    throw new HttpException(
      `Order not found: code ${props.body.order_code}`,
      404,
    );
  }

  const now = toISOStringSafe(new Date());

  const created =
    await MyGlobal.prisma.shopping_mall_mileage_transactions.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        type: props.body.transaction_type satisfies string as string,
        amount: props.body.points satisfies number as number,
        memo: props.body.description satisfies string | null as string | null,
        created_at: now,
        updated_at: now,
        shopping_mall_customer_id: customer.id,
        shopping_mall_order_code: order ? order.order_number : null,
      },
      include: {
        shoppingMallCustomer: true,
        shoppingMallOrder: {
          include: {
            shoppingMallCustomer: true,
            shoppingMallSeller: true,
          },
        },
      },
    });

  return {
    id: created.id,
    transaction_type: created.type,
    points: created.amount,
    description: created.memo ?? "",
    status: "completed",
    created_at: toISOStringSafe(created.created_at),
    updated_at: created.updated_at
      ? toISOStringSafe(created.updated_at)
      : undefined,
    customer: {
      id: created.shoppingMallCustomer.id,
      email: created.shoppingMallCustomer.email,
      name: created.shoppingMallCustomer.name,
      status: typia.assert<"active" | "inactive" | "suspended">(
        created.shoppingMallCustomer.status,
      ),
      created_at: toISOStringSafe(created.shoppingMallCustomer.created_at),
      updated_at: created.shoppingMallCustomer.updated_at
        ? toISOStringSafe(created.shoppingMallCustomer.updated_at)
        : undefined,
    },
    order: created.shoppingMallOrder
      ? {
          id: created.shoppingMallOrder.id,
          order_number: created.shoppingMallOrder.order_number,
          status: typia.assert<string>(created.shoppingMallOrder.status),
          total_amount: created.shoppingMallOrder.total_amount,
          customer: {
            id: created.shoppingMallOrder.shoppingMallCustomer.id,
            email: created.shoppingMallOrder.shoppingMallCustomer.email,
            name: created.shoppingMallOrder.shoppingMallCustomer.name,
            status: typia.assert<"active" | "inactive" | "suspended">(
              created.shoppingMallOrder.shoppingMallCustomer.status,
            ),
            created_at: toISOStringSafe(
              created.shoppingMallOrder.shoppingMallCustomer.created_at,
            ),
            updated_at: created.shoppingMallOrder.shoppingMallCustomer
              .updated_at
              ? toISOStringSafe(
                  created.shoppingMallOrder.shoppingMallCustomer.updated_at,
                )
              : undefined,
          },
          seller: {
            id: created.shoppingMallOrder.shoppingMallSeller.id,
            name: created.shoppingMallOrder.shoppingMallSeller.name,
            email: created.shoppingMallOrder.shoppingMallSeller.email,
            status: typia.assert<"active" | "inactive" | "suspended">(
              created.shoppingMallOrder.shoppingMallSeller.status,
            ),
            business_status: typia.assert<"approved" | "pending" | "rejected">(
              created.shoppingMallOrder.shoppingMallSeller.business_status,
            ),
            created_at: toISOStringSafe(
              created.shoppingMallOrder.shoppingMallSeller.created_at,
            ),
            updated_at: toISOStringSafe(
              created.shoppingMallOrder.shoppingMallSeller.updated_at,
            ),
            deleted_at:
              created.shoppingMallOrder.shoppingMallSeller.deleted_at === null
                ? null
                : created.shoppingMallOrder.shoppingMallSeller.deleted_at
                  ? toISOStringSafe(
                      created.shoppingMallOrder.shoppingMallSeller.deleted_at,
                    )
                  : null,
          },
          created_at: toISOStringSafe(created.shoppingMallOrder.created_at),
          updated_at: toISOStringSafe(created.shoppingMallOrder.updated_at),
        }
      : undefined,
  };
}
