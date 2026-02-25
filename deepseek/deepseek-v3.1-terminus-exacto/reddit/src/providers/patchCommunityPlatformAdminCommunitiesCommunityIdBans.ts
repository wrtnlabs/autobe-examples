import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100); // Enforce maximum limit
  const skip = (page - 1) * limit;
  // Build WHERE clause with proper date handling
  const whereInput = {
    community_id: props.communityId,
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
    ...(props.body.search && {
      reason: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.banned_at_start && {
      banned_at: {
        gte: new Date(props.body.banned_at_start),
      },
    }),
    ...(props.body.banned_at_end && {
      banned_at: {
        lte: new Date(props.body.banned_at_end),
      },
    }),
    ...(props.body.expires_at_start && {
      expires_at: {
        gte: new Date(props.body.expires_at_start),
      },
    }),
    ...(props.body.expires_at_end && {
      expires_at: {
        lte: new Date(props.body.expires_at_end),
      },
    }),
  } satisfies Prisma.community_platform_community_bansWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_community_bans.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" as const },
      ...CommunityPlatformCommunityBanAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_community_bans.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
