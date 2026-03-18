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

export async function patchCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const where: Prisma.community_platform_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.communityId !== undefined
      ? { community_id: props.body.communityId }
      : {}),
    ...(props.body.memberId !== undefined
      ? { member_id: props.body.memberId }
      : {}),
    ...(props.body.targetType !== undefined
      ? { target_type: props.body.targetType }
      : {}),
    ...(props.body.targetId !== undefined
      ? { target_id: props.body.targetId }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.reason !== undefined
      ? { reason: { contains: props.body.reason, mode: "insensitive" } }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
  };
  const records = await MyGlobal.prisma.community_platform_reports.findMany({
    where,
    skip,
    take: limit,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    select: {
      id: true,
      target_type: true,
      target_id: true,
      reason: true,
      status: true,
      reviewed_at: true,
      created_at: true,
      updated_at: true,
      community: {
        select: {
          id: true,
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
      member: {
        select: {
          id: true,
        },
      },
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
    data: records.map(
      (record): ICommunityPlatformReport.ISummary => ({
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
            created_at: toISOStringSafe(record.community.owner.created_at),
            updated_at: toISOStringSafe(record.community.owner.updated_at),
            deleted_at:
              record.community.owner.deleted_at === null
                ? null
                : toISOStringSafe(record.community.owner.deleted_at),
          } satisfies ICommunityPlatformMember.ISummary,
          created_at: toISOStringSafe(record.community.created_at),
          updated_at: toISOStringSafe(record.community.updated_at),
          deleted_at:
            record.community.deleted_at === null
              ? null
              : toISOStringSafe(record.community.deleted_at),
        } satisfies ICommunityPlatformCommunity.ISummary,
        member: {} satisfies ICommunityPlatformMember.ISummary,
        targetType: record.target_type,
        targetId: record.target_id,
        reason: record.reason,
        status: record.status,
        reviewedAt:
          record.reviewed_at === null
            ? null
            : toISOStringSafe(record.reviewed_at),
        createdAt: toISOStringSafe(record.created_at),
        updatedAt: toISOStringSafe(record.updated_at),
        deletedAt: null,
      }),
    ),
  };
}
