import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSalePromotion";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSalePromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSalePromotion";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorAnalyticsSalePromotions(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSalePromotion.IRequest;
}): Promise<IPageIShoppingMallSalePromotion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Record<string, unknown> = {
    deleted_at: null,
  };
  if (
    props.body.promotionCode !== undefined &&
    props.body.promotionCode !== null
  ) {
    where.promotion_code = props.body.promotionCode;
  }
  if (
    props.body.promotionType !== undefined &&
    props.body.promotionType !== null
  ) {
    where.promotion_type = props.body.promotionType;
  }
  if (props.body.active !== undefined) {
    where.active = props.body.active;
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_promotions.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
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
    }),
    MyGlobal.prisma.shopping_mall_sale_promotions.count({ where }),
  ]);
  function toDateTimeString(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    if (!date) return null;
    // We convert to ISO string explicitly
    return date.toISOString() as unknown as string & tags.Format<"date-time">;
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((row) => {
      const startAt = toDateTimeString(row.start_at);
      const endAt = toDateTimeString(row.end_at);
      const createdAt = toDateTimeString(row.created_at);
      const updatedAt = toDateTimeString(row.updated_at);
      const deletedAt = toDateTimeString(row.deleted_at);
      const saleCreatedAt = toDateTimeString(row.sale.created_at);
      const saleUpdatedAt = toDateTimeString(row.sale.updated_at);
      const saleDeletedAt = toDateTimeString(row.sale.deleted_at);
      const categoryCreatedAt = toDateTimeString(row.sale.category.created_at);
      const categoryUpdatedAt = toDateTimeString(row.sale.category.updated_at);
      const categoryDeletedAt = toDateTimeString(row.sale.category.deleted_at);
      return {
        id: row.id as string & tags.Format<"uuid">,
        promotionCode: row.promotion_code ?? null,
        promotionType: row.promotion_type,
        description: row.description ?? null,
        discountValue: row.discount_value,
        discountType: row.discount_type,
        startAt: startAt!,
        endAt: endAt!,
        active: row.active,
        createdAt: createdAt!,
        updatedAt: updatedAt!,
        deletedAt: deletedAt,
        sale: {
          id: row.sale.id as string & tags.Format<"uuid">,
          name: row.sale.name,
          basePrice: row.sale.base_price,
          status: row.sale.status,
          createdAt: saleCreatedAt!,
          updatedAt: saleUpdatedAt!,
          deletedAt: saleDeletedAt,
          seller: {
            id: row.sale.seller.id as string & tags.Format<"uuid">,
            email: row.sale.seller.email,
            shopName: row.sale.seller.shop_name,
            shopDescription: row.sale.seller.shop_description ?? null,
            logoUri: row.sale.seller.logo_uri ?? null,
            approvalStatus: row.sale.seller.approval_status,
            rejectionReason: row.sale.seller.rejection_reason ?? null,
          },
          category: {
            id: row.sale.category.id as string & tags.Format<"uuid">,
            name: row.sale.category.name,
            description: row.sale.category.description,
            created_at: categoryCreatedAt!,
            updated_at: categoryUpdatedAt!,
            deleted_at: categoryDeletedAt,
          },
        },
      };
    }),
  };
}
