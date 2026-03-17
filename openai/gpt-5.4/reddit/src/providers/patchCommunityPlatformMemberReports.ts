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

export async function patchCommunityPlatformMemberReports(props: {
  member: MemberPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  if (props.body.communityId === undefined)
    throw new HttpException("communityId is required", 400);
  const moderator =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_platform_community_id: props.body.communityId,
        community_platform_member_id: props.member.id,
        status: "active",
        revoked_at: null,
        deleted_at: null,
        community: {
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (moderator === null) throw new HttpException("Forbidden", 403);
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    community_platform_community_id: props.body.communityId,
    deleted_at: null,
    community: {
      deleted_at: null,
    },
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.resolution !== undefined && {
      resolution: props.body.resolution,
    }),
    ...(props.body.search !== undefined && {
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
    NOT: [
      {
        status: "dismissed",
      },
      {
        resolution: "dismissed",
      },
      {
        resolution: "approved_deletion",
      },
      {
        resolution: "approved",
      },
    ],
    OR: [
      {
        reportPost: {
          is: {
            deleted_at: null,
            post: {
              community_platform_community_id: props.body.communityId,
              deleted_at: null,
              community: {
                deleted_at: null,
              },
            },
          },
        },
      },
      {
        reportComment: {
          is: {
            comment: {
              deleted_at: null,
              post: {
                community_platform_community_id: props.body.communityId,
                deleted_at: null,
                community: {
                  deleted_at: null,
                },
              },
            },
          },
        },
      },
    ],
  } satisfies Prisma.community_platform_reportsWhereInput;
  const orderByInput =
    props.body.sort === "oldest"
      ? ({
          created_at: "asc",
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
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...CommunityPlatformReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: whereInput,
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
