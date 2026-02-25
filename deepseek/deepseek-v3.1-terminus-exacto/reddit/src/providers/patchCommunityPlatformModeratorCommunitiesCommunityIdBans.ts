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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformCommunityBanAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommunitiesCommunityIdBans(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunityBan.IRequest;
}): Promise<IPageICommunityPlatformCommunityBan.ISummary> {
  // First ensure moderator has access to this community
  const moderatorAssignment =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.moderator.id,
      },
    });
  if (!moderatorAssignment) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build where condition - handle null status and date filters
  const whereInput = {
    community_id: props.communityId,
    ...(props.body.status !== undefined && props.body.status !== null
      ? { status: props.body.status }
      : {}),
    ...(props.body.search !== undefined &&
      props.body.search.trim() !== "" && {
        reason: { contains: props.body.search },
      }),
    ...(props.body.banned_at_start !== undefined && {
      banned_at: { gte: props.body.banned_at_start },
    }),
    ...(props.body.banned_at_end !== undefined && {
      banned_at: { lte: props.body.banned_at_end },
    }),
    ...(props.body.expires_at_start !== undefined && {
      expires_at: { gte: props.body.expires_at_start },
    }),
    ...(props.body.expires_at_end !== undefined && {
      expires_at: { lte: props.body.expires_at_end },
    }),
  } satisfies Prisma.community_platform_community_bansWhereInput;
  // Get data with pagination
  const data = await MyGlobal.prisma.community_platform_community_bans.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { banned_at: "desc" as const },
      ...CommunityPlatformCommunityBanAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.community_platform_community_bans.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
