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
import { CommunityPlatformBanCollector } from "../collectors/CommunityPlatformBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.ICreate;
}): Promise<ICommunityPlatformBan> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const community =
      await prisma.community_platform_communities.findFirstOrThrow({
        where: {
          id: props.communityId,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    const moderationRole =
      await prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_community_id: community.id,
          community_platform_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
    if (moderationRole === null) throw new HttpException("Forbidden", 403);
    const member = await prisma.community_platform_members.findFirst({
      where: {
        id: props.body.communityPlatformMemberId,
      },
      select: {
        id: true,
      },
    });
    if (member === null) throw new HttpException("Not Found", 404);
    if (props.body.reason.trim().length === 0)
      throw new HttpException("Invalid reason", 422);
    if (
      props.body.endedAt !== undefined &&
      props.body.endedAt !== null &&
      props.body.endedAt <= props.body.startedAt
    ) {
      throw new HttpException("Invalid end time", 422);
    }
    const existing = await prisma.community_platform_bans.findFirst({
      where: {
        community_platform_community_id: community.id,
        community_platform_member_id: member.id,
        started_at: new Date(props.body.startedAt),
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    if (existing !== null) throw new HttpException("Conflict", 409);
    const created = await prisma.community_platform_bans.create({
      data: await CommunityPlatformBanCollector.collect({
        body: {
          communityPlatformMemberId: member.id,
          reason: props.body.reason,
          startedAt: props.body.startedAt,
          endedAt: props.body.endedAt ?? null,
        },
        community,
      }),
    });
    const loaded = await prisma.community_platform_bans.findUniqueOrThrow({
      where: {
        id: created.id,
      },
      ...CommunityPlatformBanTransformer.select(),
    });
    return await CommunityPlatformBanTransformer.transform(loaded);
  });
}
