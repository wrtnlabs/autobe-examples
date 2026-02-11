import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBannedUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBannedUserAtSummaryTransformer } from "../transformers/CommunityBannedUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityBannedUser.IRequest;
}): Promise<IPageICommunityBannedUser.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where = {
    community_id: props.communityId,
    deleted_at: null,
    ...(props.body.reason
      ? { reason: { contains: props.body.reason } }
      : undefined),
  };
  const data = await MyGlobal.prisma.community_banned_users.findMany({
    where: where,
    skip,
    take: limit,
    orderBy: { banned_at: "desc" },
    select: {
      id: true,
      banned_at: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      bannedUser: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          created_at: true,
          deleted_at: true,
        },
      },
      bannedCommunity: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_url: true,
          created_at: true,
          owner: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              created_at: true,
              deleted_at: true,
            },
          },
          deleted_at: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.community_banned_users.count({
    where: where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data.map((item) => ({
        ...item,
        bannedCommunity: {
          ...item.bannedCommunity,
          owner: item.bannedCommunity.owner,
        },
      })),
      CommunityBannedUserAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
