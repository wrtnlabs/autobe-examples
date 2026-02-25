import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
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

export async function patchCommunityPlatformAdminReportsReportIdReportedContents(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: ICommunityPlatformReportedContent.IRequest;
}): Promise<IPageICommunityPlatformReportedContent.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereFilter: Prisma.community_platform_reported_contentsWhereInput = {
    report: { id: props.reportId },
  };
  const andFilters: Prisma.community_platform_reported_contentsWhereInput[] =
    [];
  if (props.body.contentType === "post") {
    andFilters.push({ reportedComment: null });
  } else if (props.body.contentType === "comment") {
    andFilters.push({ reportedPost: null });
  }
  if (props.body.createdAfter != null) {
    andFilters.push({ created_at: { gt: props.body.createdAfter } });
  }
  if (props.body.createdBefore != null) {
    andFilters.push({ created_at: { lt: props.body.createdBefore } });
  }
  if (props.body.isDeleted != null) {
    if (props.body.isDeleted) {
      andFilters.push({ deleted_at: { not: null } });
    } else {
      andFilters.push({ deleted_at: null });
    }
  }
  if (andFilters.length > 0) {
    whereFilter.AND = andFilters;
  }
  const [totalCount, data] = await Promise.all([
    MyGlobal.prisma.community_platform_reported_contents.count({
      where: whereFilter,
    }),
    MyGlobal.prisma.community_platform_reported_contents.findMany({
      where: whereFilter,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        report: {
          select: {
            id: true,
            description: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            reportReason: {
              select: {
                id: true,
                reason_text: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        reportedPost: {
          select: {
            id: true,
            title: true,
            post_type: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        reportedComment: {
          select: {
            id: true,
            content: true,
            is_deleted: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            user: {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            parent_id: true,
          },
        },
      },
    }),
  ]);
  function transformUser(user: unknown): ICommunityPlatformUser.ISummary {
    const u = user as {
      id: string & tags.Format<"uuid">;
      email: string;
      username: string;
      display_name: string;
      bio: string | null | undefined;
      avatar_url: string | null | undefined;
      karma: number;
      created_at: Date | string;
      updated_at: Date | string;
      deleted_at: Date | string | null;
    };
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.display_name,
      bio: u.bio ?? undefined,
      avatarUrl: u.avatar_url ?? undefined,
      karma: u.karma,
      created_at: toISOStringSafe(u.created_at),
      updated_at: toISOStringSafe(u.updated_at),
      deleted_at: u.deleted_at ? toISOStringSafe(u.deleted_at) : null,
    };
  }
  function transformReportReason(
    reason: unknown,
  ): ICommunityPlatformReportReason.ISummary {
    const r = reason as {
      id: string & tags.Format<"uuid">;
      reason_text: string;
      created_at: Date | string;
      updated_at: Date | string;
      deleted_at: Date | string | null;
    };
    return {
      id: r.id,
      reasonText: r.reason_text,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    };
  }
  function transformReport(report: unknown): ICommunityPlatformReport.ISummary {
    const rep = report as {
      id: string & tags.Format<"uuid">;
      description: string;
      status: string;
      created_at: Date | string;
      updated_at: Date | string;
      deleted_at: Date | string | null;
      user: unknown;
      reportReason: unknown;
    };
    return {
      id: rep.id,
      description: rep.description,
      status: rep.status,
      created_at: toISOStringSafe(rep.created_at),
      updated_at: toISOStringSafe(rep.updated_at),
      deleted_at: rep.deleted_at ? toISOStringSafe(rep.deleted_at) : null,
      user: transformUser(rep.user),
      reportReason: transformReportReason(rep.reportReason),
      reportedContents_count: 0,
    };
  }
  function transformPost(post: unknown): ICommunityPlatformPost.ISummary {
    const p = post as {
      id: string & tags.Format<"uuid">;
      title: string;
      post_type: string;
      created_at: Date | string;
      updated_at: Date | string;
      deleted_at: Date | string | null;
    };
    return {
      id: p.id,
      title: p.title,
      postType: p.post_type,
      created_at: toISOStringSafe(p.created_at),
      updated_at: toISOStringSafe(p.updated_at),
      deleted_at: p.deleted_at ? toISOStringSafe(p.deleted_at) : null,
      community: {
        id: "00000000-0000-0000-0000-000000000000" as string &
          tags.Format<"uuid">,
        name: "Unknown",
        description: "",
        iconUrl: "",
        subscriberCount: 0,
        ownerUser: {
          id: "00000000-0000-0000-0000-000000000000" as string &
            tags.Format<"uuid">,
          email: "",
          username: "",
          displayName: "",
          karma: 0,
          created_at: "1970-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          updated_at: "1970-01-01T00:00:00.000Z" as string &
            tags.Format<"date-time">,
          deleted_at: null,
        },
        created_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        updated_at: "1970-01-01T00:00:00.000Z" as string &
          tags.Format<"date-time">,
        deleted_at: null,
      } satisfies ICommunityPlatformCommunity.ISummary,
      vote_score: 0,
      comment_count: 0,
    };
  }
  function transformComment(
    comment: unknown,
  ): ICommunityPlatformComment.ISummary {
    const c = comment as {
      id: string & tags.Format<"uuid">;
      content: string;
      is_deleted: boolean;
      created_at: Date | string;
      updated_at: Date | string;
      deleted_at: Date | string | null;
      user: unknown;
      parent_id: string | null;
    };
    return {
      id: c.id,
      content: c.content,
      isDeleted: c.is_deleted,
      created_at: toISOStringSafe(c.created_at),
      updated_at: toISOStringSafe(c.updated_at),
      deleted_at: c.deleted_at ? toISOStringSafe(c.deleted_at) : null,
      user: transformUser(c.user),
      parent_id: c.parent_id ?? null,
      children: [],
    };
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / limit),
    },
    data: data.map((record) => ({
      id: record.id,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
      report: record.report ? transformReport(record.report) : null,
      reportedPost: record.reportedPost
        ? transformPost(record.reportedPost)
        : null,
      reportedComment: record.reportedComment
        ? transformComment(record.reportedComment)
        : null,
    })),
  };
}
