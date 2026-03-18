import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
    },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_order_id: props.orderId,
    ...(props.body.shopping_mall_seller_id !== undefined && {
      shopping_mall_seller_id: props.body.shopping_mall_seller_id,
    }),
    ...(props.body.carrier_name !== undefined && {
      carrier_name: {
        contains: props.body.carrier_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.tracking_number !== undefined && {
      tracking_number: {
        contains: props.body.tracking_number,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.shipped_at_from !== undefined ||
    props.body.shipped_at_to !== undefined
      ? {
          shipped_at: {
            ...(props.body.shipped_at_from !== undefined && {
              gte: new Date(props.body.shipped_at_from),
            }),
            ...(props.body.shipped_at_to !== undefined && {
              lte: new Date(props.body.shipped_at_to),
            }),
          },
        }
      : {}),
    ...(props.body.delivered_at_from !== undefined ||
    props.body.delivered_at_to !== undefined
      ? {
          delivered_at: {
            ...(props.body.delivered_at_from !== undefined && {
              gte: new Date(props.body.delivered_at_from),
            }),
            ...(props.body.delivered_at_to !== undefined && {
              lte: new Date(props.body.delivered_at_to),
            }),
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to !== undefined && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
    ...(props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(props.body.updated_at_from !== undefined && {
              gte: new Date(props.body.updated_at_from),
            }),
            ...(props.body.updated_at_to !== undefined && {
              lte: new Date(props.body.updated_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_shipmentsWhereInput;
  const orderBy = (
    props.body.sort === "carrier_name_asc"
      ? { carrier_name: "asc" as const }
      : props.body.sort === "carrier_name_desc"
        ? { carrier_name: "desc" as const }
        : props.body.sort === "tracking_number_asc"
          ? { tracking_number: "asc" as const }
          : props.body.sort === "tracking_number_desc"
            ? { tracking_number: "desc" as const }
            : props.body.sort === "status_asc"
              ? { status: "asc" as const }
              : props.body.sort === "status_desc"
                ? { status: "desc" as const }
                : props.body.sort === "shipped_at_asc"
                  ? { shipped_at: "asc" as const }
                  : props.body.sort === "shipped_at_desc"
                    ? { shipped_at: "desc" as const }
                    : props.body.sort === "delivered_at_asc"
                      ? { delivered_at: "asc" as const }
                      : props.body.sort === "delivered_at_desc"
                        ? { delivered_at: "desc" as const }
                        : props.body.sort === "created_at_asc"
                          ? { created_at: "asc" as const }
                          : props.body.sort === "updated_at_asc"
                            ? { updated_at: "asc" as const }
                            : { created_at: "desc" as const }
  ) satisfies Prisma.shopping_mall_shipmentsOrderByWithRelationInput;
  const shipments = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      shipments,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
