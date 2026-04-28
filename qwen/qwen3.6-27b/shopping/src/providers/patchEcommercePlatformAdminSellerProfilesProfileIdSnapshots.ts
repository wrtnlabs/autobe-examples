import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommercePlatformSnapshotSellerProfileAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotSellerProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformAdminSellerProfilesProfileIdSnapshots(props: {
  admin: AdminPayload;
  profileId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshotSellerProfile.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotSellerProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_platform_seller_profiles_id:
      props.body.seller_profile_id ?? props.profileId,
    ...((props.body.startDate !== undefined ||
      props.body.endDate !== undefined) && {
      ecommercePlatformSnapshots: {
        created_at: {
          ...(props.body.startDate !== undefined && {
            gte: props.body.startDate,
          }),
          ...(props.body.endDate !== undefined && { lte: props.body.endDate }),
        },
      },
    }),
    ...(props.body.search !== undefined && {
      OR: [
        { previous_shop_name: { contains: props.body.search } },
        { current_shop_name: { contains: props.body.search } },
        { previous_shop_description: { contains: props.body.search } },
        { current_shop_description: { contains: props.body.search } },
        { previous_logo_uri: { contains: props.body.search } },
        { current_logo_uri: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_platform_snapshot_seller_profilesWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.transform,
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
// import { IEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotSellerProfile";
// import { IPageIEcommercePlatformSnapshotSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotSellerProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformAdminSellerProfilesProfileIdSnapshots(props: {
//   admin: AdminPayload;
//   profileId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshotSellerProfile.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotSellerProfile.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_seller_profiles.findMany({
//     ...EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotSellerProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------