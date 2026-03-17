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

export async function patchCommunityPlatformMemberCommunitiesCommunityIdReports(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null || community.status !== "active") {
    throw new HttpException("Unavailable community", 404);
  }
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
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
    });
  if (moderator === null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_community_id: props.communityId,
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.resolution !== undefined
      ? { resolution: props.body.resolution }
      : {}),
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
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
        }
      : {}),
  } satisfies Prisma.community_platform_reportsWhereInput;
  const orderBy =
    props.body.sort === "oldest"
      ? ({
          created_at: "asc",
        } satisfies Prisma.community_platform_reportsOrderByWithRelationInput)
      : props.body.sort === "reason_asc"
        ? ({
            reason: "asc",
          } satisfies Prisma.community_platform_reportsOrderByWithRelationInput)
        : props.body.sort === "reason_desc"
          ? ({
              reason: "desc",
            } satisfies Prisma.community_platform_reportsOrderByWithRelationInput)
          : props.body.sort === "updated_at_asc"
            ? ({
                updated_at: "asc",
              } satisfies Prisma.community_platform_reportsOrderByWithRelationInput)
            : props.body.sort === "updated_at_desc"
              ? ({
                  updated_at: "desc",
                } satisfies Prisma.community_platform_reportsOrderByWithRelationInput)
              : ({
                  created_at: "desc",
                } satisfies Prisma.community_platform_reportsOrderByWithRelationInput);
  const data = await MyGlobal.prisma.community_platform_reports.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformReportAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
