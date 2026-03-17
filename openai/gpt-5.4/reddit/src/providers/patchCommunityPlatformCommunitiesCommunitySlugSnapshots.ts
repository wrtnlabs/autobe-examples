import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySnapshotAtSummaryTransformer } from "../transformers/CommunityPlatformCommunitySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformCommunitiesCommunitySlugSnapshots(props: {
  communitySlug: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySnapshot.IRequest;
}): Promise<IPageICommunityPlatformCommunitySnapshot.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        slug: props.communitySlug,
      },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException("Not Found", 404);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_community_id: community.id,
    deleted_at: null,
    ...(props.body.visibility !== undefined
      ? {
          visibility: props.body.visibility,
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? {
                  gte: new globalThis.Date(props.body.createdAtFrom),
                }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? {
                  lte: new globalThis.Date(props.body.createdAtTo),
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_community_snapshotsWhereInput;
  const orderBy =
    props.body.sort === "created_at_asc" || props.body.sort === "oldest"
      ? ({
          created_at: "asc",
        } satisfies Prisma.community_platform_community_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.community_platform_community_snapshotsOrderByWithRelationInput);
  const data =
    await MyGlobal.prisma.community_platform_community_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...CommunityPlatformCommunitySnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_community_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunitySnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
