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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformReportAtSummaryTransformer } from "../transformers/CommunityPlatformReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberCommunitiesCommunityIdModerationActionsModerationActionIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  moderationActionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  await MyGlobal.prisma.community_platform_community_moderators.findFirstOrThrow(
    {
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        revoked_at: null,
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
  const where = {
    community_platform_moderation_action_id: props.moderationActionId,
    deleted_at: null,
    report: {
      community_platform_community_id: props.communityId,
      deleted_at: null,
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      ...(props.body.resolution !== undefined && {
        resolution: props.body.resolution,
      }),
      ...(props.body.search !== undefined &&
        props.body.search.length !== 0 && {
          OR: [
            {
              reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              detail: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }),
    },
  } satisfies Prisma.community_platform_moderation_action_reportsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? [{ report: { created_at: "asc" } }]
      : props.body.sort === "reason"
        ? [{ report: { reason: "asc" } }]
        : props.body.sort === "reason_desc"
          ? [{ report: { reason: "desc" } }]
          : [{ report: { created_at: "desc" } }]
  ) satisfies Prisma.community_platform_moderation_action_reportsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.community_platform_moderation_action_reports.findMany(
      {
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          report: CommunityPlatformReportAtSummaryTransformer.select(),
        },
      } satisfies Prisma.community_platform_moderation_action_reportsFindManyArgs,
    );
  const total =
    await MyGlobal.prisma.community_platform_moderation_action_reports.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      async (record) =>
        await CommunityPlatformReportAtSummaryTransformer.transform(
          record.report,
        ),
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
