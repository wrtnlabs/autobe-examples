import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformPostSnapshots(props: {
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<IPageICommunityPlatformPostSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.community_platform_post_snapshots.findMany({
      where: {},
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        created_at: true,
        vote_score: true,
        comment_count: true,
        community_platform_post_id: true,
      },
    });
  const total = await MyGlobal.prisma.community_platform_post_snapshots.count({
    where: {},
  });
  return {
    data: records.map((item) => ({
      id: item.id,
      post_title: item.title,
      snapshot_created_at: toISOStringSafe(item.created_at),
      vote_score: item.vote_score,
      comment_count: item.comment_count,
      community_platform_post_id: item.community_platform_post_id,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
