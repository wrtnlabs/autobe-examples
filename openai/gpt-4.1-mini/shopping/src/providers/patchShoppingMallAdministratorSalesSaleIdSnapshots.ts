import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
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

export async function patchShoppingMallAdministratorSalesSaleIdSnapshots(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_snapshotsWhereInput = {
    shopping_mall_sale_id: props.saleId,
    ...(props.body.startDate
      ? { created_at: { gte: props.body.startDate } }
      : {}),
    ...(props.body.endDate ? { created_at: { lte: props.body.endDate } } : {}),
    ...(props.body.changeTypes && props.body.changeTypes.length > 0
      ? { change_type: { in: props.body.changeTypes } }
      : {}),
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category_id: true,
      base_price: true,
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
  const total = await MyGlobal.prisma.shopping_mall_sale_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      title: record.title,
      description: record.description,
      categoryId: record.category_id,
      basePrice: record.base_price,
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
      sale: {
        id: record.sale.id,
        name: record.sale.name,
        basePrice: record.sale.base_price,
        status: record.sale.status,
        createdAt: toISOStringSafe(record.sale.created_at),
        updatedAt: toISOStringSafe(record.sale.updated_at),
        deletedAt:
          record.sale.deleted_at === null
            ? null
            : toISOStringSafe(record.sale.deleted_at),
        seller: {
          id: record.sale.seller.id,
          email: record.sale.seller.email,
          shopName: record.sale.seller.shop_name,
          shopDescription: record.sale.seller.shop_description ?? null,
          logoUri: record.sale.seller.logo_uri ?? null,
          approvalStatus: record.sale.seller.approval_status,
          rejectionReason: record.sale.seller.rejection_reason ?? null,
        },
        category: {
          id: record.sale.category.id,
          name: record.sale.category.name,
          description: record.sale.category.description,
          created_at: toISOStringSafe(record.sale.category.created_at),
          updated_at: toISOStringSafe(record.sale.category.updated_at),
          deleted_at:
            record.sale.category.deleted_at === null
              ? null
              : toISOStringSafe(record.sale.category.deleted_at),
        },
      },
    })),
  };
}
