import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
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

export async function patchShoppingMallSellerSalesSaleIdUnits(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleUnit.IRequest;
}): Promise<IPageIShoppingMallSaleUnit.ISummary> {
  const { seller, saleId, body } = props;
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: { id: saleId, seller_id: seller.id, deleted_at: null },
  });
  if (!sale) throw new HttpException("Forbidden", 403);
  const page = body.page && body.page >= 1 ? body.page : 1;
  const limit =
    body.limit && body.limit >= 1 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_unitsWhereInput = {
    sale: { id: saleId },
    deleted_at: null,
    ...(body.skuCode ? { sku_code: { contains: body.skuCode } } : {}),
    ...(body.optionValues
      ? { option_values: { contains: body.optionValues } }
      : {}),
    ...(typeof body.priceOverride === "number"
      ? { price_override: body.priceOverride }
      : {}),
  };
  const units = await MyGlobal.prisma.shopping_mall_sale_units.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      sku_code: true,
      option_values: true,
      price_override: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      sale: {
        select: {
          id: true,
          name: true,
          base_price: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          seller: {
            select: {
              id: true,
              email: true,
              shop_name: true,
              shop_description: true,
              logo_uri: true,
              approval_status: true,
              rejection_reason: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_units.count({ where });
  const data: IShoppingMallSaleUnit.ISummary[] = units.map((unit) => ({
    id: unit.id,
    skuCode: unit.sku_code,
    optionValues: unit.option_values,
    priceOverride:
      unit.price_override === undefined ? null : unit.price_override,
    createdAt: toISOStringSafe(unit.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(unit.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt:
      unit.deleted_at === null
        ? null
        : (toISOStringSafe(unit.deleted_at) as
            | (string & tags.Format<"date-time">)
            | null),
    sale: {
      id: unit.sale.id,
      name: unit.sale.name,
      basePrice: unit.sale.base_price,
      status: unit.sale.status,
      created_at: toISOStringSafe(unit.sale.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(unit.sale.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        unit.sale.deleted_at === null
          ? null
          : (toISOStringSafe(unit.sale.deleted_at) as
              | (string & tags.Format<"date-time">)
              | null),
      seller: {
        id: unit.sale.seller.id,
        email: unit.sale.seller.email,
        shopName: unit.sale.seller.shop_name,
        shopDescription:
          unit.sale.seller.shop_description === undefined
            ? null
            : unit.sale.seller.shop_description,
        logoUri:
          unit.sale.seller.logo_uri === undefined
            ? null
            : unit.sale.seller.logo_uri,
        approvalStatus: unit.sale.seller.approval_status,
        rejectionReason:
          unit.sale.seller.rejection_reason === undefined
            ? null
            : unit.sale.seller.rejection_reason,
      },
      category: {
        id: unit.sale.category.id,
        name: unit.sale.category.name,
        description: unit.sale.category.description,
        created_at: toISOStringSafe(unit.sale.category.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(unit.sale.category.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at:
          unit.sale.category.deleted_at === null
            ? null
            : (toISOStringSafe(unit.sale.category.deleted_at) as
                | (string & tags.Format<"date-time">)
                | null),
      },
    },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data,
  };
}
