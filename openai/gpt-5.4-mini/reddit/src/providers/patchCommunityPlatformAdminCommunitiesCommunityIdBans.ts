import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBan";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminCommunitiesCommunityIdBans(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.IRequest;
}): Promise<IPageICommunityPlatformBan.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const sortOrder: Prisma.SortOrder =
    props.body.sort === "old" ? "asc" : "desc";
  const where: Prisma.community_platform_bansWhereInput = {
    community_platform_community_id: props.communityId,
    ...(props.body.isActive === true
      ? { ended_at: null, deleted_at: null }
      : props.body.isActive === false
        ? { OR: [{ ended_at: { not: null } }, { deleted_at: { not: null } }] }
        : {}),
    ...(search !== undefined && search.length > 0
      ? {
          OR: [
            { reason: { contains: search, mode: "insensitive" } },
            { member: { username: { contains: search, mode: "insensitive" } } },
            {
              member: {
                display_name: { contains: search, mode: "insensitive" },
              },
            },
            { member: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
  const data = await MyGlobal.prisma.community_platform_bans.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { started_at: sortOrder },
      { created_at: sortOrder },
      { id: sortOrder },
    ],
    select: {
      id: true,
      reason: true,
      started_at: true,
      ended_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      member: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_image_uri: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      community: {
        select: {
          id: true,
          owner_id: true,
          name: true,
          description: true,
          icon_image_url: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              email: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_image_uri: true,
              karma: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  const records = await MyGlobal.prisma.community_platform_bans.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(data, async (ban) => ({
      id: ban.id,
      member: {
        id: ban.member.id,
        email: ban.member.email,
        username: ban.member.username,
        display_name: ban.member.display_name,
        bio: ban.member.bio,
        avatar_image_uri: ban.member.avatar_image_uri,
        karma: ban.member.karma,
        created_at: ban.member.created_at.toISOString(),
        updated_at: ban.member.updated_at.toISOString(),
        deleted_at:
          ban.member.deleted_at === null
            ? null
            : ban.member.deleted_at.toISOString(),
      },
      community: {
        id: ban.community.id,
        name: ban.community.name,
        description: ban.community.description,
        iconImageUrl: ban.community.icon_image_url,
        status: ban.community.status,
        owner: {
          id: ban.community.owner.id,
          email: ban.community.owner.email,
          username: ban.community.owner.username,
          display_name: ban.community.owner.display_name,
          bio: ban.community.owner.bio,
          avatar_image_uri: ban.community.owner.avatar_image_uri,
          karma: ban.community.owner.karma,
          created_at: ban.community.owner.created_at.toISOString(),
          updated_at: ban.community.owner.updated_at.toISOString(),
          deleted_at:
            ban.community.owner.deleted_at === null
              ? null
              : ban.community.owner.deleted_at.toISOString(),
        },
        created_at: ban.community.created_at.toISOString(),
        updated_at: ban.community.updated_at.toISOString(),
        deleted_at:
          ban.community.deleted_at === null
            ? null
            : ban.community.deleted_at.toISOString(),
      },
      reason: ban.reason,
      started_at: ban.started_at.toISOString(),
      ended_at: ban.ended_at === null ? null : ban.ended_at.toISOString(),
      created_at: ban.created_at.toISOString(),
      updated_at: ban.updated_at.toISOString(),
      deleted_at: ban.deleted_at === null ? null : ban.deleted_at.toISOString(),
    })),
  };
}
