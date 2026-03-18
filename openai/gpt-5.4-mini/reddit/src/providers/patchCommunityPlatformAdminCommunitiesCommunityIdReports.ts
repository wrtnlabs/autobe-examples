import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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

export async function patchCommunityPlatformAdminCommunitiesCommunityIdReports(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.admin.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (moderationRole === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = 1;
  const limit = 20;
  const skip = 0;
  const where = {
    community_id: props.communityId,
    deleted_at: null,
  } satisfies Prisma.community_platform_reportsWhereInput;
  const records = await MyGlobal.prisma.community_platform_reports.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take: limit,
    select: {
      id: true,
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_image_url: true,
          status: true,
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
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
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
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      reviewed_at: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      async (record) =>
        ({
          id: record.id,
          community: {
            id: record.community.id,
            name: record.community.name,
            description: record.community.description,
            iconImageUrl: record.community.icon_image_url,
            status: record.community.status,
            owner: {
              id: record.community.owner.id,
              email: record.community.owner.email,
              username: record.community.owner.username,
              display_name: record.community.owner.display_name,
              bio: record.community.owner.bio,
              avatar_image_uri: record.community.owner.avatar_image_uri,
              karma: record.community.owner.karma,
              created_at: record.community.owner.created_at.toISOString(),
              updated_at: record.community.owner.updated_at.toISOString(),
              deleted_at:
                record.community.owner.deleted_at === null
                  ? null
                  : record.community.owner.deleted_at.toISOString(),
            },
            created_at: record.community.created_at.toISOString(),
            updated_at: record.community.updated_at.toISOString(),
            deleted_at:
              record.community.deleted_at === null
                ? null
                : record.community.deleted_at.toISOString(),
          } satisfies ICommunityPlatformCommunity.ISummary,
          member: {
            id: record.member.id,
            email: record.member.email,
            username: record.member.username,
            display_name: record.member.display_name,
            bio: record.member.bio,
            avatar_image_uri: record.member.avatar_image_uri,
            karma: record.member.karma,
            created_at: record.member.created_at.toISOString(),
            updated_at: record.member.updated_at.toISOString(),
            deleted_at:
              record.member.deleted_at === null
                ? null
                : record.member.deleted_at.toISOString(),
          } satisfies ICommunityPlatformMember.ISummary,
          targetType: record.target_type,
          targetId: record.target_id,
          reason: record.reason,
          status: record.status,
          reviewedAt:
            record.reviewed_at === null
              ? null
              : record.reviewed_at.toISOString(),
          createdAt: record.created_at.toISOString(),
          updatedAt: record.updated_at.toISOString(),
          deletedAt:
            record.deleted_at === null ? null : record.deleted_at.toISOString(),
        }) satisfies ICommunityPlatformReport.ISummary,
    ),
  };
}
