import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IUpdate;
}): Promise<ICommunityPlatformBan> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community.owner_id !== props.admin.id) {
    throw new HttpException("Forbidden", 403);
  }
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: { id: props.banId },
    select: {
      id: true,
      community_platform_community_id: true,
      started_at: true,
      ended_at: true,
    },
  });
  if (ban.community_platform_community_id !== props.communityId) {
    throw new HttpException("Not Found", 404);
  }
  const nextStartedAt: string =
    props.body.started_at !== undefined
      ? props.body.started_at
      : ban.started_at.toISOString();
  const nextEndedAt: string | null =
    props.body.ended_at !== undefined
      ? props.body.ended_at
      : ban.ended_at === null
        ? null
        : ban.ended_at.toISOString();
  if (nextEndedAt !== null && nextEndedAt < nextStartedAt) {
    throw new HttpException("Invalid ban period", 400);
  }
  await MyGlobal.prisma.community_platform_bans.update({
    where: { id: props.banId },
    data: {
      ...(props.body.reason !== undefined ? { reason: props.body.reason } : {}),
      ...(props.body.started_at !== undefined
        ? { started_at: new Date(props.body.started_at) }
        : {}),
      ...(props.body.ended_at !== undefined
        ? {
            ended_at:
              props.body.ended_at === null
                ? null
                : new Date(props.body.ended_at),
          }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...CommunityPlatformBanTransformer.select(),
    });
  return await CommunityPlatformBanTransformer.transform(updated);
}
