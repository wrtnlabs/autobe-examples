import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformSnapshotAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerProductsProductIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshot.IRequest;
}): Promise<IPageIEcommercePlatformSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.ecommerce_platform_products.findUniqueOrThrow({
      where: {
        id: props.productId,
      },
      select: {
        ecommerce_platform_seller_profile_id: true,
      },
    });
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirst({
      where: {
        id: product.ecommerce_platform_seller_profile_id,
        seller_id: props.seller.id,
      },
    });
  if (sellerProfile === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    entity_type: "product",
    snapshotProduct: {
      ecommerce_platform_product_id: props.productId,
    },
    ...(props.body.createdAtFrom && {
      created_at: {
        gte: props.body.createdAtFrom,
      },
    }),
    ...(props.body.createdAtTo && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
    ...(props.body.search && {
      OR: [
        {
          snapshotProduct: {
            name_current: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        },
        {
          snapshotProduct: {
            description_current: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        },
      ],
    }),
  } satisfies Prisma.ecommerce_platform_snapshotsWhereInput;
  const transformerSelect =
    EcommercePlatformSnapshotAtSummaryTransformer.select();
  const records = await MyGlobal.prisma.ecommerce_platform_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...transformerSelect,
  });
  const total = await MyGlobal.prisma.ecommerce_platform_snapshots.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommercePlatformSnapshot.ISummary;
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
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IPageIEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerProductsProductIdSnapshots(props: {
//   seller: SellerPayload;
//   productId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshot.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshots.findMany({
//     ...EcommercePlatformSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------