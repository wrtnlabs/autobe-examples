import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
import { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotVariantOptionAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptions(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshotVariantOption.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotVariantOption.ISummary> {
  const variant =
    await MyGlobal.prisma.ecommerce_platform_product_variants.findUniqueOrThrow(
      {
        where: {
          id: props.variantId,
        },
        select: {
          id: true,
          ecommerce_platform_product_id: true,
        },
      },
    );
  if (variant.ecommerce_platform_product_id !== props.productId) {
    throw new HttpException(
      "Product variant does not belong to the specified product",
      404,
    );
  }
  const snapshot =
    await MyGlobal.prisma.ecommerce_platform_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        entity_type: true,
      },
    });
  if (snapshot.entity_type !== "product_variant") {
    throw new HttpException(
      "Snapshot entity type must be product_variant",
      400,
    );
  }
  const snapshotVariant =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variants.findFirstOrThrow(
      {
        where: {
          ecommerce_platform_snapshot_id: props.snapshotId,
          ecommerce_platform_product_variant_id: props.variantId,
        },
        select: {
          id: true,
        },
      },
    );
  const where: Prisma.ecommerce_platform_snapshot_variant_optionsWhereInput = {
    ecommerce_platform_snapshot_variant_id: snapshotVariant.id,
    ...(props.body.key !== undefined && props.body.key !== ""
      ? {
          key: {
            contains: props.body.key,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.value !== undefined && props.body.value !== ""
      ? {
          value: {
            contains: props.body.value,
            mode: "insensitive",
          },
        }
      : {}),
  };
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variant_options.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          key: "asc",
        },
        {
          created_at: "asc",
        },
      ],
      ...EcommercePlatformSnapshotVariantOptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_variant_options.count({
      where,
    });
  const transformedData = await ArrayUtil.asyncMap(
    records,
    EcommercePlatformSnapshotVariantOptionAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData satisfies IEcommercePlatformSnapshotVariantOption.ISummary[],
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
// import { IEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariantOption";
// import { IPageIEcommercePlatformSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotVariantOption";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotVariant";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotIdOptions(props: {
//   admin: AdminPayload;
//   productId: string & tags.Format<"uuid">;
//   variantId: string & tags.Format<"uuid">;
//   snapshotId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshotVariantOption.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotVariantOption.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_variant_options.findMany({
//     ...EcommercePlatformSnapshotVariantOptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotVariantOptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------