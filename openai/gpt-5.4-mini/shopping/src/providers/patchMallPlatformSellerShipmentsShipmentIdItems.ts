import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShipmentItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IMallPlatformShipmentItem.IRequest;
}): Promise<IPageIMallPlatformShipmentItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const shipment =
    await MyGlobal.prisma.mall_platform_shipments.findFirstOrThrow({
      where: {
        id: props.shipmentId,
        mall_platform_seller_id: props.seller.id,
        deleted_at: null,
      },
      select: {
        id: true,
        mall_platform_seller_id: true,
      },
    });
  const search: string | undefined = props.body.search;
  const where: Prisma.mall_platform_shipment_itemsWhereInput = {
    deleted_at: null,
    mall_platform_shipment_id: shipment.id,
    ...(search === undefined
      ? {}
      : {
          OR: [
            {
              orderItem: {
                status: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              orderItem: {
                productVariant: {
                  sku_code: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              orderItem: {
                productVariant: {
                  option_values: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            },
            {
              orderItem: {
                productVariant: {
                  product: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            },
          ],
        }),
  };
  const orderBy: Prisma.mall_platform_shipment_itemsOrderByWithRelationInput =
    props.body.sort === "createdAtAsc"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const rows = await MyGlobal.prisma.mall_platform_shipment_items.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      mall_platform_order_item_id: true,
      mall_platform_shipment_id: true,
    },
  });
  const total = await MyGlobal.prisma.mall_platform_shipment_items.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      async (row): Promise<IMallPlatformShipmentItem.ISummary> => ({
        id: row.id,
        shipment: {
          id: row.mall_platform_shipment_id,
          seller: {
            id: props.seller.id,
            email: null as unknown as string,
            status: null as unknown as string,
            rejectionReason: null,
            createdAt: toISOStringSafe(new Date(0)),
            updatedAt: toISOStringSafe(new Date(0)),
            deletedAt: null,
          },
          order: {
            id: "" as string,
            orderNumber: "" as string,
            status: "" as string,
            totalAmount: 0 as number,
            createdAt: toISOStringSafe(new Date(0)),
          },
          carrierName: "" as string,
          trackingNumber: "" as string,
          trackingUrl: null,
          status: null as unknown as string,
          shippedAt: null,
          deliveredAt: null,
          createdAt: toISOStringSafe(row.created_at),
          updatedAt: toISOStringSafe(row.updated_at),
          deletedAt:
            row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
        },
        orderItem: {
          id: row.mall_platform_order_item_id,
          quantity: 0 as number,
          status: null as unknown as string,
          order: {
            id: "" as string,
            orderNumber: "" as string,
            status: "" as string,
            totalAmount: 0 as number,
            createdAt: toISOStringSafe(new Date(0)),
          },
          productVariant: {
            id: "" as string,
            skuCode: "" as string,
            optionValues: null as unknown as string,
            priceOverride: null,
            isActive: false,
            product: {
              id: "" as string,
              name: "" as string,
              description: "" as string,
              basePrice: 0 as number,
              sellerAccount: {
                id: "" as string,
                email: "" as string,
                approvalStatus: null as unknown as string,
                rejectionReason: null,
                suspendedAt: null,
                deletedAt: null,
                createdAt: toISOStringSafe(new Date(0)),
                updatedAt: toISOStringSafe(new Date(0)),
              },
              category: null,
              createdAt: toISOStringSafe(new Date(0)),
              updatedAt: toISOStringSafe(new Date(0)),
              deletedAt: null,
            },
            createdAt: toISOStringSafe(row.created_at),
            updatedAt: toISOStringSafe(row.updated_at),
            deletedAt:
              row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
          },
          seller: {
            id: props.seller.id,
            email: null as unknown as string,
            status: null as unknown as string,
            rejectionReason: null,
            createdAt: toISOStringSafe(new Date(0)),
            updatedAt: toISOStringSafe(new Date(0)),
            deletedAt: null,
          },
          created_at: toISOStringSafe(row.created_at),
          updated_at: toISOStringSafe(row.updated_at),
          deleted_at:
            row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
        },
        created_at: toISOStringSafe(row.created_at),
        updated_at: toISOStringSafe(row.updated_at),
        deleted_at:
          row.deleted_at === null ? null : toISOStringSafe(row.deleted_at),
      }),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
