import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicPoliticalBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicPoliticalBoardGuestArticlesArticleIdAttachments(props: {
  guest: GuestPayload;
  articleId: string & tags.Format<"uuid">;
  body: IEconomicPoliticalBoardArticle.IManageAttachmentsRequest;
}): Promise<IPageIEconomicPoliticalBoardAttachment.ISummary> {
  const article =
    await MyGlobal.prisma.economic_political_board_articles.findUniqueOrThrow({
      where: { id: props.articleId },
      select: { id: true, author_id: true, deleted_at: true },
    });
  if (article.author_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article is deleted", 400);
  }
  if (props.body.attachmentIds) {
    await MyGlobal.prisma.economic_political_board_attachments.deleteMany({
      where: {
        id: {
          in: props.body.attachmentIds,
        },
        article_id: props.articleId,
      },
    });
  }
  if (props.body.attachments) {
    await Promise.all(
      props.body.attachments.map((attachment) =>
        MyGlobal.prisma.economic_political_board_attachments.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            article_id: props.articleId,
            file_url: attachment.file_url,
            file_name: attachment.file_name,
            file_type: attachment.file_type,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        }),
      ),
    );
  }
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.economic_political_board_attachments.findMany({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      } satisfies Prisma.economic_political_board_attachmentsOrderByWithRelationInput,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            author_id: true,
            section_id: true,
            content: true,
            deleted_at: true,
            created_at: true,
            updated_at: true,
            author: {
              select: {
                id: true,
                user_id: true,
                created_at: true,
                updated_at: true,
                promoted_at: true,
                promoted_by_user_id: true,
                grade: true,
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: {
                      select: {
                        display_name: true,
                        bio: true,
                      },
                    },
                  },
                },
              },
            },
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      } satisfies Prisma.economic_political_board_attachmentsInclude,
    });
  const total =
    await MyGlobal.prisma.economic_political_board_attachments.count({
      where: {
        article_id: props.articleId,
        deleted_at: null,
      },
    });
  const transformedData = await ArrayUtil.asyncMap(data, async (item) => {
    return {
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at !== null ? toISOStringSafe(item.deleted_at) : null,
      article: {
        created_at: toISOStringSafe(item.article.created_at),
        updated_at: toISOStringSafe(item.article.updated_at),
        deleted_at:
          item.article.deleted_at !== null
            ? toISOStringSafe(item.article.deleted_at)
            : null,
        title: item.article.title,
        author_id: item.article.author_id,
        id: item.article.id,
        section_id: item.article.section_id,
        content: item.article.content,
        author: {
          createdAt: toISOStringSafe(item.article.author.created_at),
          updatedAt: toISOStringSafe(item.article.author.updated_at),
          promotedAt:
            item.article.author.promoted_at !== null
              ? toISOStringSafe(item.article.author.promoted_at)
              : null,
          id: item.article.author.id,
          userId: item.article.author.user_id,
          grade: item.article.author.grade,
          promotedByUserId: item.article.author.promoted_by_user_id ?? null,
          user: {
            id: item.article.author.user.id,
            email: item.article.author.user.email,
            displayName: item.article.author.user.profile.display_name,
            bio: item.article.author.user.profile.bio,
          },
        },
        section: {
          created_at: toISOStringSafe(item.article.section.created_at),
          id: item.article.section.id,
          name: item.article.section.name,
          description: item.article.section.description,
          articleCount: 0,
        },
      },
      id: item.id,
      file_url: item.file_url,
      file_name: item.file_name,
      file_type: item.file_type,
      article_id: item.article_id,
    } satisfies IEconomicPoliticalBoardAttachment.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
