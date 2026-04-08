import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantSnapshotOptionAtSummaryTransformer } from "../transformers/MallPlatformProductVariantSnapshotOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshotOption.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_product_variant_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.snapshotId,
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
      },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    mall_platform_product_variant_snapshot_id: props.snapshotId,
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              option_key: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              option_value: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.mall_platform_product_variant_snapshot_optionsWhereInput;
  const orderBy = (
    props.body.sort === "option_value"
      ? { option_value: "asc" }
      : props.body.sort === "option_value_desc"
        ? { option_value: "desc" }
        : props.body.sort === "option_key_desc"
          ? { option_key: "desc" }
          : props.body.sort === "option_key"
            ? { option_key: "asc" }
            : { id: "asc" }
  ) satisfies Prisma.mall_platform_product_variant_snapshot_optionsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.transform,
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
// import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
// import { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   body: IMallPlatformProductVariantSnapshotOption.IRequest;
// }): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany({
//     ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------