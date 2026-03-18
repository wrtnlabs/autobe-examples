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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IUpdate;
}): Promise<ICommunityPlatformBan> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community === null) {
    throw new HttpException("Not Found", 404);
  }
  const role =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (community.owner_id !== props.member.id && role === null) {
    throw new HttpException("Forbidden", 403);
  }
  const ban = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      id: props.banId,
      community_platform_community_id: props.communityId,
    },
    select: {
      id: true,
      community_platform_community_id: true,
      community_platform_member_id: true,
      reason: true,
      started_at: true,
      ended_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      member: {
        select: {
          id: true,
        },
      },
      community: {
        ...CommunityPlatformCommunityAtSummaryTransformer.select(),
      },
    },
  });
  if (ban === null) {
    throw new HttpException("Not Found", 404);
  }
  if (
    props.body.started_at !== undefined &&
    props.body.ended_at !== undefined &&
    props.body.ended_at !== null &&
    props.body.ended_at < props.body.started_at
  ) {
    throw new HttpException("Invalid ban period", 400);
  }
  await MyGlobal.prisma.community_platform_bans.update({
    where: {
      id: props.banId,
    },
    data: {
      ...(props.body.reason !== undefined ? { reason: props.body.reason } : {}),
      ...(props.body.started_at !== undefined
        ? { started_at: props.body.started_at }
        : {}),
      ...(props.body.ended_at !== undefined
        ? { ended_at: props.body.ended_at }
        : {}),
      updated_at: toISOStringSafe(new Date()),
    },
  });
  const updated =
    await MyGlobal.prisma.community_platform_bans.findFirstOrThrow({
      where: {
        id: props.banId,
        community_platform_community_id: props.communityId,
      },
      ...CommunityPlatformBanTransformer.select(),
    });
  return await CommunityPlatformBanTransformer.transform(updated);
}
