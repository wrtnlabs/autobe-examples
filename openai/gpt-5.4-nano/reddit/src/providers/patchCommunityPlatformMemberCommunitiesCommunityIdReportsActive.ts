import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportTarget";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdReportsActive(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page = 1 as number & tags.Type<"int32">;
  const limit = 100 as number & tags.Type<"int32">;
  const skip = (page - 1) * limit;
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true, community_owner_id: true },
    });
  if (community === null) {
    throw new HttpException("Forbidden", 403);
  }
  const isOwner = community.community_owner_id === props.member.id;
  if (!isOwner) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          moderator_user_id: props.member.id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (moderator === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const whereInput = {
    community_id: props.communityId,
    deleted_at: null,
    AND: [
      {
        OR: [
          { resolution: { is: null } },
          {
            resolution: {
              is: { resolution_decision: { not: "dismissed" } },
            },
          },
        ],
      },
    ],
  } satisfies Prisma.community_platform_reportsWhereInput;
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.community_platform_reports.findMany({
    where: whereInput,
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      reason: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      reporter: {
        select: {
          id: true,
          userProfile: {
            select: {
              display_name: true,
              bio: true,
              avatar_uri: true,
            },
          },
        },
      },
      community: {
        select: {
          id: true,
          name: true,
          description: true,
          icon_href: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          owner: {
            select: {
              id: true,
              userProfile: {
                select: {
                  display_name: true,
                  bio: true,
                  avatar_uri: true,
                },
              },
            },
          },
          communitySubscriptions: {
            where: { is_active: true, deleted_at: null },
            select: { id: true },
          },
        },
      },
      targets: {
        where: { deleted_at: null },
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          id: true,
          target_type: true,
          target_id: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const data = records.map((r) => {
    const reporterProfile = r.reporter.userProfile;
    const reporter: ICommunityPlatformMember.ISummary = {
      id: r.reporter.id as string & tags.Format<"uuid">,
      display_name: reporterProfile?.display_name ?? "",
      bio: reporterProfile?.bio ?? null,
      avatar_uri: reporterProfile?.avatar_uri ?? null,
    };
    const communityObj: ICommunityPlatformCommunity.ISummary = {
      id: r.community.id as string & tags.Format<"uuid">,
      owner: {
        id: r.community.owner.id as string & tags.Format<"uuid">,
        display_name: r.community.owner.userProfile?.display_name ?? "",
        bio: r.community.owner.userProfile?.bio ?? null,
        avatar_uri: r.community.owner.userProfile?.avatar_uri ?? null,
      },
      name: r.community.name,
      description: r.community.description,
      icon_href: r.community.icon_href as string & tags.Format<"uri">,
      subscriber_count: r.community.communitySubscriptions.length as number &
        tags.Type<"int32">,
      created_at: toISOStringSafe(r.community.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(r.community.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: r.community.deleted_at
        ? (toISOStringSafe(r.community.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
    const targetRow = r.targets[0];
    if (targetRow === undefined) {
      throw new HttpException("Forbidden", 403);
    }
    const reportBase = {
      id: r.id as string & tags.Format<"uuid">,
      reporter,
      community: communityObj,
      reason: r.reason,
      createdAt: toISOStringSafe(r.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(r.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt: r.deleted_at
        ? (toISOStringSafe(r.deleted_at) as string & tags.Format<"date-time">)
        : null,
    } satisfies Omit<ICommunityPlatformReport.ISummary, "target">;
    const target: ICommunityPlatformReportTarget = {
      id: targetRow.id as string & tags.Format<"uuid">,
      report: reportBase as unknown as ICommunityPlatformReport.ISummary,
      target_type: targetRow.target_type,
      target_id: targetRow.target_id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(targetRow.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(targetRow.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: targetRow.deleted_at
        ? (toISOStringSafe(targetRow.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
    const summary: ICommunityPlatformReport.ISummary = {
      ...reportBase,
      target,
    } satisfies ICommunityPlatformReport.ISummary;
    return summary;
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page as unknown as number & tags.Minimum<0> & tags.Type<"int32">,
      limit: limit as unknown as number & tags.Minimum<0> & tags.Type<"int32">,
      records: total as unknown as number &
        tags.Minimum<0> &
        tags.Type<"int32">,
      pages: pages as unknown as number & tags.Minimum<0> & tags.Type<"int32">,
    },
    data,
  };
}
