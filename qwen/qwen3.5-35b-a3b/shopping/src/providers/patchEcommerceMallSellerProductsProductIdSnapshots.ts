import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshot";
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

export async function patchEcommerceMallSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
      where: {
        id: props.productId,
        seller_id: props.seller.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_product_snapshotsWhereInput = {
    ecommerce_mall_product_id: props.productId,
    ...(props.body.dateRangeStart !== undefined && {
      created_at: { gte: new Date(props.body.dateRangeStart) },
    }),
    ...(props.body.dateRangeEnd !== undefined && {
      created_at: { lte: new Date(props.body.dateRangeEnd) },
    }),
  } satisfies Prisma.ecommerce_mall_product_snapshotsWhereInput;
  const data = await MyGlobal.prisma.ecommerce_mall_product_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      base_price: true,
      sale_price: true,
      status: true,
      created_at: true,
      product: {
        select: {
          id: true,
          name: true,
          base_price: true,
          slug: true,
          status: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              parent_id: true,
              display_order: true,
              is_active: true,
            },
          },
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_product_snapshots.count({
    where: whereInput,
  });
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    data: await ArrayUtil.asyncMap(data, async (snapshot) => ({
      id: snapshot.id,
      product: {
        id: snapshot.product.id,
        name: snapshot.product.name,
        base_price: snapshot.product.base_price,
        slug: snapshot.product.slug,
        status: snapshot.product.status,
        category: snapshot.product.category as IEcommerceMallCategory.ISummary,
        deleted_at: snapshot.product.deleted_at
          ? toISOStringSafe(snapshot.product.deleted_at)
          : null,
      },
      name: snapshot.name,
      description: snapshot.description,
      base_price: snapshot.base_price,
      sale_price: snapshot.sale_price,
      status: snapshot.status,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
    pagination,
  };
}
