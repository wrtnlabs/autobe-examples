import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformInventoryRecordAtSummaryTransformer } from "../transformers/MallPlatformInventoryRecordAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdVariantsVariantIdInventoryRecords(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IMallPlatformInventoryRecord.IRequest;
}): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
  await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
    where: { id: props.productId },
    select: { id: true },
  });
  const variant =
    await MyGlobal.prisma.mall_platform_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: {
        id: true,
        product: {
          select: {
            id: true,
          },
        },
      },
    });
  if (variant.product.id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_product_variant_id: props.variantId,
    ...(props.body.reason !== undefined || props.body.search !== undefined
      ? {
          OR: [
            ...(props.body.reason !== undefined
              ? [
                  {
                    reason: {
                      contains: props.body.reason,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ]
              : []),
            ...(props.body.search !== undefined
              ? [
                  {
                    reason: {
                      contains: props.body.search,
                      mode: Prisma.QueryMode.insensitive,
                    },
                  },
                ]
              : []),
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_inventory_recordsWhereInput;
  const records =
    await MyGlobal.prisma.mall_platform_inventory_records.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        props.body.sort === "oldest"
          ? ({
              created_at: "asc",
            } satisfies Prisma.mall_platform_inventory_recordsOrderByWithRelationInput)
          : ({
              created_at: "desc",
            } satisfies Prisma.mall_platform_inventory_recordsOrderByWithRelationInput),
      ...MallPlatformInventoryRecordAtSummaryTransformer.select(),
    });
  const recordsCount =
    await MyGlobal.prisma.mall_platform_inventory_records.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformInventoryRecordAtSummaryTransformer.transform,
    ),
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformInventoryRecord";
// import { IPageIMallPlatformInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformInventoryRecord";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorProductsProductIdVariantsVariantIdInventoryRecords(props: {
//   administrator: AdministratorPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   body: IMallPlatformInventoryRecord.IRequest;
// }): Promise<IPageIMallPlatformInventoryRecord.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_inventory_records.findMany({
//     ...MallPlatformInventoryRecordAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformInventoryRecordAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------