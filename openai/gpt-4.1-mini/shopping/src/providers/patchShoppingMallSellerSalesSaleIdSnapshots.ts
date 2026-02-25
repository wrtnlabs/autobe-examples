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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSalesSaleIdSnapshots(props: {
  seller: SellerPayload;
  saleId: string & tags.Format<"uuid">;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_snapshotsWhereInput = {
    shopping_mall_sale_id: props.saleId,
    deleted_at: null,
    ...(props.body.startDate
      ? { created_at: { gte: props.body.startDate } }
      : {}),
    ...(props.body.endDate ? { created_at: { lte: props.body.endDate } } : {}),
    ...(props.body.changeTypes
      ? { change_type: { in: props.body.changeTypes } }
      : {}),
  };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
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
    MyGlobal.prisma.shopping_mall_sale_snapshots.count({ where }),
  ]);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((snapshot) => ({
      id: snapshot.id,
      title: snapshot.title,
      description: snapshot.description,
      categoryId: snapshot.category_id,
      basePrice: snapshot.base_price,
      createdAt: toISOStringSafe(snapshot.created_at),
      updatedAt: toISOStringSafe(snapshot.updated_at),
      deletedAt: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
      sale: {
        id: snapshot.sale.id,
        name: snapshot.sale.name,
        basePrice: snapshot.sale.base_price,
        status: snapshot.sale.status,
        createdAt: toISOStringSafe(snapshot.sale.created_at),
        updatedAt: toISOStringSafe(snapshot.sale.updated_at),
        deletedAt: snapshot.sale.deleted_at
          ? toISOStringSafe(snapshot.sale.deleted_at)
          : null,
        seller: {
          id: snapshot.sale.seller.id,
          email: snapshot.sale.seller.email,
          shopName: snapshot.sale.seller.shop_name,
          shopDescription: snapshot.sale.seller.shop_description ?? null,
          logoUri: snapshot.sale.seller.logo_uri ?? null,
          approvalStatus: snapshot.sale.seller.approval_status,
          rejectionReason: snapshot.sale.seller.rejection_reason ?? null,
        },
        category: {
          id: snapshot.sale.category.id,
          name: snapshot.sale.category.name,
          description: snapshot.sale.category.description,
          created_at: toISOStringSafe(snapshot.sale.category.created_at),
          updated_at: toISOStringSafe(snapshot.sale.category.updated_at),
          deleted_at: snapshot.sale.category.deleted_at
            ? toISOStringSafe(snapshot.sale.category.deleted_at)
            : null,
        },
      },
    })),
  };
}
