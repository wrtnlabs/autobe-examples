import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
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

export async function patchMallPlatformSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshotOption.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
  await MyGlobal.prisma.mall_platform_product_variants.findFirstOrThrow({
    where: {
      id: props.variantId,
      mall_platform_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.mall_platform_product_variant_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.snapshotId,
        mall_platform_product_variant_id: props.variantId,
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
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany(
      {
        where: {
          mall_platform_product_variant_snapshot_id: props.snapshotId,
          ...(props.body.search !== undefined
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
          ...(props.body.optionKey !== undefined
            ? {
                option_key: {
                  contains: props.body.optionKey,
                  mode: "insensitive",
                },
              }
            : {}),
          ...(props.body.optionValue !== undefined
            ? {
                option_value: {
                  contains: props.body.optionValue,
                  mode: "insensitive",
                },
              }
            : {}),
        },
        skip,
        take: limit,
        orderBy: {
          option_key: "asc",
        },
        ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  const recordsCount =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.count({
      where: {
        mall_platform_product_variant_snapshot_id: props.snapshotId,
        ...(props.body.search !== undefined
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
        ...(props.body.optionKey !== undefined
          ? {
              option_key: {
                contains: props.body.optionKey,
                mode: "insensitive",
              },
            }
          : {}),
        ...(props.body.optionValue !== undefined
          ? {
              option_value: {
                contains: props.body.optionValue,
                mode: "insensitive",
              },
            }
          : {}),
      },
    });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: Math.ceil(recordsCount / limit),
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
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptions(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
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