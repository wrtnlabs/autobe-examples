import { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityBanAtSummaryTransformer } from "../transformers/CommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityMemberCommunitiesCommunityNameBans(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityBan.IRequest;
}): Promise<IPageICommunityBan.ISummary> {
  const community =
    await MyGlobal.prisma.community_communities.findUniqueOrThrow({
      where: {
        name: props.communityName,
        deleted_at: null,
      },
      select: { id: true },
    });
  const moderator = await MyGlobal.prisma.community_moderators.findFirst({
    where: {
      community_id: community.id,
      member_id: props.member.id,
    },
    select: { id: true },
  });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const now = new Date();
  const expiredAtFilter =
    props.body.status === "active"
      ? {
          OR: [{ expired_at: null }, { expired_at: { gt: now } }],
        }
      : props.body.status === "expired"
        ? { expired_at: { lt: now } }
        : {};
  const data = await MyGlobal.prisma.community_bans.findMany({
    where: {
      community_id: community.id,
      ...(props.body.username && {
        member: {
          username: {
            contains: props.body.username,
            mode: "insensitive",
          },
        },
      }),
      ...expiredAtFilter,
      ...(props.body.created_from && {
        created_at: { gte: new Date(props.body.created_from) },
      }),
      ...(props.body.created_to && {
        created_at: { lte: new Date(props.body.created_to) },
      }),
    },
    skip,
    take: limit,
    orderBy: {
      [props.body.sort ?? "created_at"]: props.body.order ?? "desc",
    },
    ...CommunityBanAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_bans.count({
    where: {
      community_id: community.id,
      ...(props.body.username && {
        member: {
          username: {
            contains: props.body.username,
            mode: "insensitive",
          },
        },
      }),
      ...expiredAtFilter,
      ...(props.body.created_from && {
        created_at: { gte: new Date(props.body.created_from) },
      }),
      ...(props.body.created_to && {
        created_at: { lte: new Date(props.body.created_to) },
      }),
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
