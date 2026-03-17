import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallInventoryRecordTransformer } from "../transformers/ShoppingMallInventoryRecordTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSellerProductsProductIdVariantsVariantIdInventoryRecords(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IShoppingMallInventoryRecord.IRequest;
}): Promise<IPageIShoppingMallInventoryRecord> {
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        shopping_mall_seller_id: true,
        deleted_at: true,
      },
    });
  if (
    product.deleted_at !== null ||
    product.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      shopping_mall_product_id: props.productId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    shopping_mall_product_variant_id: props.variantId,
    deleted_at: null,
    ...(props.body.reason !== undefined && {
      reason: {
        contains: props.body.reason,
      },
    }),
    ...((props.body.occurred_from !== undefined ||
      props.body.occurred_to !== undefined) && {
      occurred_at: {
        ...(props.body.occurred_from !== undefined && {
          gte: props.body.occurred_from,
        }),
        ...(props.body.occurred_to !== undefined && {
          lte: props.body.occurred_to,
        }),
      },
    }),
  } satisfies Prisma.shopping_mall_inventory_recordsWhereInput;
  const orderByInput = (
    props.body.sort === "occurred_at_asc"
      ? [{ occurred_at: "asc" }, { created_at: "asc" }]
      : props.body.sort === "created_at_desc"
        ? [{ created_at: "desc" }, { occurred_at: "desc" }]
        : props.body.sort === "created_at_asc"
          ? [{ created_at: "asc" }, { occurred_at: "asc" }]
          : [{ occurred_at: "desc" }, { created_at: "desc" }]
  ) satisfies Prisma.shopping_mall_inventory_recordsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.shopping_mall_inventory_records.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...ShoppingMallInventoryRecordTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_inventory_records.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallInventoryRecordTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
