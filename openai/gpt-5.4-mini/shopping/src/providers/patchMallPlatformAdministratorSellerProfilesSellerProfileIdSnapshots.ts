import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformSellerProfileSnapshotAtSummaryTransformer } from "../transformers/MallPlatformSellerProfileSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorSellerProfilesSellerProfileIdSnapshots(props: {
  administrator: AdministratorPayload;
  sellerProfileId: string & tags.Format<"uuid">;
  body: IMallPlatformSellerProfileSnapshot.IRequest;
}): Promise<IPageIMallPlatformSellerProfileSnapshot.ISummary> {
  void props.administrator;
  await MyGlobal.prisma.mall_platform_seller_profiles.findUniqueOrThrow({
    where: { id: props.sellerProfileId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const where = {
    seller_profile_id: props.sellerProfileId,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { shop_name: { contains: search, mode: "insensitive" } },
            { shop_description: { contains: search, mode: "insensitive" } },
          ],
        }),
  } satisfies Prisma.mall_platform_seller_profile_snapshotsWhereInput;
  const orderBy = [
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const },
  ] satisfies Prisma.mall_platform_seller_profile_snapshotsOrderByWithRelationInput[];
  const snapshots =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...MallPlatformSellerProfileSnapshotAtSummaryTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.mall_platform_seller_profile_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      MallPlatformSellerProfileSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    } satisfies IPage.IPagination,
  };
}
