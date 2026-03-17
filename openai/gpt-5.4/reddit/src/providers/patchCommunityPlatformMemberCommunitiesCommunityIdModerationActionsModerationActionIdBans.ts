import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationActionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformModerationActionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModerationActionBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationActionBanAtSummaryTransformer } from "../transformers/CommunityPlatformModerationActionBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationActionBan.IRequest;
}): Promise<IPageICommunityPlatformModerationActionBan.ISummary> {
  await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
    {
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  await MyGlobal.prisma.community_platform_moderation_actions.findFirstOrThrow({
    where: {
      id: props.moderationActionId,
      community_platform_community_id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const communityBanWhere = {
    community_platform_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      reason: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...((props.body.startedAtFrom !== undefined ||
      props.body.startedAtTo !== undefined) && {
      started_at: {
        ...(props.body.startedAtFrom !== undefined && {
          gte: props.body.startedAtFrom,
        }),
        ...(props.body.startedAtTo !== undefined && {
          lte: props.body.startedAtTo,
        }),
      },
    }),
    ...((props.body.hasExpiredAt !== undefined ||
      props.body.expiredAtFrom !== undefined ||
      props.body.expiredAtTo !== undefined) && {
      expired_at:
        props.body.hasExpiredAt === false
          ? null
          : {
              ...(props.body.hasExpiredAt === true && {
                not: null,
              }),
              ...(props.body.expiredAtFrom !== undefined && {
                gte: props.body.expiredAtFrom,
              }),
              ...(props.body.expiredAtTo !== undefined && {
                lte: props.body.expiredAtTo,
              }),
            },
    }),
    ...((props.body.hasLiftedAt !== undefined ||
      props.body.liftedAtFrom !== undefined ||
      props.body.liftedAtTo !== undefined) && {
      lifted_at:
        props.body.hasLiftedAt === false
          ? null
          : {
              ...(props.body.hasLiftedAt === true && {
                not: null,
              }),
              ...(props.body.liftedAtFrom !== undefined && {
                gte: props.body.liftedAtFrom,
              }),
              ...(props.body.liftedAtTo !== undefined && {
                lte: props.body.liftedAtTo,
              }),
            },
    }),
  } satisfies Prisma.community_platform_community_bansWhereInput;
  const whereInput = {
    community_platform_moderation_action_id: props.moderationActionId,
    deleted_at: null,
    communityBan: communityBanWhere,
  } satisfies Prisma.community_platform_moderation_action_bansWhereInput;
  const orderByInput =
    props.body.sort === "oldest"
      ? ([
          { created_at: "asc" },
          { id: "asc" },
        ] satisfies Prisma.community_platform_moderation_action_bansOrderByWithRelationInput[])
      : props.body.sort === "started_at_asc"
        ? ([
            { communityBan: { started_at: "asc" } },
            { id: "asc" },
          ] satisfies Prisma.community_platform_moderation_action_bansOrderByWithRelationInput[])
        : props.body.sort === "started_at_desc"
          ? ([
              { communityBan: { started_at: "desc" } },
              { id: "desc" },
            ] satisfies Prisma.community_platform_moderation_action_bansOrderByWithRelationInput[])
          : ([
              { created_at: "desc" },
              { id: "desc" },
            ] satisfies Prisma.community_platform_moderation_action_bansOrderByWithRelationInput[]);
  const data =
    await MyGlobal.prisma.community_platform_moderation_action_bans.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformModerationActionBanAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_moderation_action_bans.count({
      where: whereInput,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformModerationActionBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
