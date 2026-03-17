import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
        deleted_at: null,
      },
      select: { id: true },
    });
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_id: props.productId,
      product_variant_id: props.variantId,
      ...(props.body.search !== undefined && {
        sku_code: {
          contains: props.body.search,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
      ...(props.body.changeType !== undefined && {
        change_type: props.body.changeType,
      }),
      ...(props.body.fromDate !== undefined && {
        created_at: { gte: new Date(props.body.fromDate) },
      }),
      ...(props.body.toDate !== undefined && {
        created_at: { lt: new Date(props.body.toDate) },
      }),
    };
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        sku_code: true,
        options: true,
        price: true,
        stock_quantity: true,
        status: true,
        created_at: true,
      } satisfies Prisma.ecommerce_mall_product_variant_snapshotsSelect,
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    });
  const totalPages = Math.ceil(total / limit);
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: totalPages,
  } satisfies IPage.IPagination;
  const transformedData: IEcommerceMallProductVariantSnapshot.ISummary[] =
    data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          sku_code: snapshot.sku_code,
          options: snapshot.options,
          price: snapshot.price,
          stock_quantity: snapshot.stock_quantity,
          status: snapshot.status,
          created_at: snapshot.created_at.toISOString(),
        }) satisfies IEcommerceMallProductVariantSnapshot.ISummary,
    );
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallProductVariantSnapshot.ISummary;
}
