import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommentReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformModeratorCommentReports(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformCommentReport.IRequest;
}): Promise<IPageICommunityPlatformCommentReport.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_comment_reportsWhereInput = {
    deleted_at: null,
    ...(props.body.report_reason_id !== undefined &&
    props.body.report_reason_id !== null
      ? { report_reason_id: props.body.report_reason_id }
      : {}),
    ...(props.body.status !== undefined ? { status: props.body.status } : {}),
    ...(props.body.reporter_user_id !== undefined &&
    props.body.reporter_user_id !== null
      ? { reporter_user_id: props.body.reporter_user_id }
      : {}),
    created_at: {
      ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null
        ? { gte: props.body.created_at_from }
        : {}),
      ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null
        ? { lte: props.body.created_at_to }
        : {}),
    },
  };
  if (
    props.body.community_id !== undefined &&
    props.body.community_id !== null
  ) {
    where.comment = {
      is: {
        post: {
          is: {
            community: {
              is: {
                id: props.body.community_id,
              },
            },
          },
        },
      },
    };
  }
  const dataRaw =
    await MyGlobal.prisma.community_platform_comment_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        status: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        comment: {
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
            children: {
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
                children: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        reporterUser: {
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
    });
  const total = await MyGlobal.prisma.community_platform_comment_reports.count({
    where,
  });
  function mapComment(comment: {
    id: string;
    content: string;
    is_deleted: boolean;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date | null;
    user: {
      id: string;
      email: string;
      username: string;
      display_name: string;
      bio: string | null;
      avatar_url: string | null;
      karma: number;
      created_at: Date;
      updated_at: Date;
      deleted_at: Date | null;
    };
    parent_id: string | null;
    children: any[];
  }): ICommunityPlatformComment.ISummary {
    return {
      id: comment.id,
      content: comment.content,
      isDeleted: comment.is_deleted,
      createdAt: toISOStringSafe(comment.created_at),
      updatedAt: toISOStringSafe(comment.updated_at),
      author: {
        id: comment.user.id,
        email: comment.user.email,
        username: comment.user.username,
        displayName: comment.user.display_name,
        bio: comment.user.bio ?? null,
        avatarUrl: comment.user.avatar_url ?? null,
        karma: comment.user.karma,
        createdAt: toISOStringSafe(comment.user.created_at),
        updatedAt: toISOStringSafe(comment.user.updated_at),
        deletedAt: comment.user.deleted_at
          ? toISOStringSafe(comment.user.deleted_at)
          : null,
      },
      parentId: comment.parent_id ?? null,
      children: comment.children.map(mapComment),
    };
  }
  const data: ICommunityPlatformCommentReport.ISummary[] = dataRaw.map((r) => ({
    id: r.id,
    status: r.status,
    description: r.description ?? null,
    createdAt: toISOStringSafe(r.created_at),
    updatedAt: toISOStringSafe(r.updated_at),
    deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    comment: mapComment(r.comment),
    reporterUser: {
      id: r.reporterUser.id,
      email: r.reporterUser.email,
      username: r.reporterUser.username,
      displayName: r.reporterUser.display_name,
      bio: r.reporterUser.bio ?? null,
      avatarUrl: r.reporterUser.avatar_url ?? null,
      karma: r.reporterUser.karma,
      createdAt: toISOStringSafe(r.reporterUser.created_at),
      updatedAt: toISOStringSafe(r.reporterUser.updated_at),
      deletedAt: r.reporterUser.deleted_at
        ? toISOStringSafe(r.reporterUser.deleted_at)
        : null,
    },
    reportReason:
      r.reportReason === null
        ? null
        : {
            id: r.reportReason.id,
            reasonText: r.reportReason.reason_text,
            createdAt: toISOStringSafe(r.reportReason.created_at),
            updatedAt: toISOStringSafe(r.reportReason.updated_at),
            deletedAt: r.reportReason.deleted_at
              ? toISOStringSafe(r.reportReason.deleted_at)
              : null,
          },
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
