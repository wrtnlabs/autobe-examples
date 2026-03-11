import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
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

export async function patchDiscussionBoardMemberSearchAttachments(props: {
  member: MemberPayload;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions for search filters
  const whereConditions: Prisma.discussion_board_attachmentsWhereInput = {
    deleted_at: null,
    article: {
      deleted_at: null,
      status: "published",
    },
    ...(props.body.search && {
      filename: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.filetype && { filetype: props.body.filetype }),
    ...(props.body.mime_type && { mime_type: props.body.mime_type }),
    ...(props.body.size_min !== undefined && {
      size_bytes: { gte: props.body.size_min },
    }),
    ...(props.body.size_max !== undefined && {
      size_bytes: { lte: props.body.size_max },
    }),
    ...(props.body.created_after && {
      created_at: {
        gte: props.body.created_after,
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: props.body.created_before,
      },
    }),
  };
  // Get paginated attachments with optimized joins
  const attachments =
    await MyGlobal.prisma.discussion_board_attachments.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        article: {
          include: {
            author: {
              select: {
                id: true,
                display_name: true,
                bio: true,
              },
            },
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
              },
            },
            _count: {
              select: {
                comments: {
                  where: { deleted_at: null },
                },
              },
            },
          },
        },
      },
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.discussion_board_attachments.count({
    where: whereConditions,
  });
  // Transform results to DTO format
  const data = attachments.map((attachment) => {
    return {
      id: attachment.id as string & tags.Format<"uuid">,
      filename: attachment.filename,
      filetype: attachment.filetype,
      mime_type: attachment.mime_type,
      size_bytes: attachment.size_bytes,
      created_at: toISOStringSafe(attachment.created_at) as string &
        tags.Format<"date-time">,
      article: {
        id: attachment.article.id as string & tags.Format<"uuid">,
        title: attachment.article.title,
        author: {
          id: attachment.article.author.id as string & tags.Format<"uuid">,
          display_name: attachment.article.author.display_name,
          bio: attachment.article.author.bio,
        } satisfies IDiscussionBoardMember.ISummary,
        section: {
          id: attachment.article.section.id as string & tags.Format<"uuid">,
          name: attachment.article.section.name,
          description: attachment.article.section.description,
          created_at: toISOStringSafe(
            attachment.article.section.created_at,
          ) as string & tags.Format<"date-time">,
        } satisfies IDiscussionBoardSection.ISummary,
        tags: [] satisfies IDiscussionBoardArticleTag.ISummary[], // Tags not available in current schema
        comments_count: attachment.article._count.comments as number &
          tags.Type<"int32">,
        created_at: toISOStringSafe(attachment.article.created_at) as string &
          tags.Format<"date-time">,
      } satisfies IDiscussionBoardArticle.ISummary,
    } satisfies IDiscussionBoardAttachment.ISummary;
  });
  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data,
  };
}
