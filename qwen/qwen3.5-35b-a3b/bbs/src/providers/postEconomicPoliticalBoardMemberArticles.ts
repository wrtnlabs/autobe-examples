import { IEconomicPoliticalBoardAdministratorRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAdministratorRole";
import { IEconomicPoliticalBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticle";
import { IEconomicPoliticalBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardArticleAttachment";
import { IEconomicPoliticalBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardAttachment";
import { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEconomicPoliticalBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardSection";
import { IEconomicPoliticalBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function postEconomicPoliticalBoardMemberArticles(props: {
  member: MemberPayload;
  body: IEconomicPoliticalBoardArticle.ICreate;
}): Promise<IEconomicPoliticalBoardArticle> {
  // Validate section exists
  const section =
    await MyGlobal.prisma.economic_political_board_sections.findUnique({
      where: { id: props.body.section_id },
    });
  if (section === null) {
    throw new HttpException("Section not found", 404);
  }
  // Validate tags exist
  if (props.body.tagIds && props.body.tagIds.length > 0) {
    const tagList =
      await MyGlobal.prisma.economic_political_board_tags.findMany({
        where: {
          id: { in: props.body.tagIds },
        },
      });
    if (tagList.length !== props.body.tagIds.length) {
      throw new HttpException("One or more tags not found", 404);
    }
  }
  // Validate attachments
  if (props.body.attachmentData && props.body.attachmentData.length > 0) {
    for (const attachment of props.body.attachmentData) {
      if (attachment.file_name.length === 0) {
        throw new HttpException("File name cannot be empty", 400);
      }
      if (attachment.file_type !== "image" && attachment.file_type !== "file") {
        throw new HttpException("Invalid file type", 400);
      }
    }
  }
  // Create article with proper validation
  const articleId: string & tags.Format<"uuid"> = v4();
  const created =
    await MyGlobal.prisma.economic_political_board_articles.create({
      data: {
        id: articleId,
        title: props.body.title,
        content: props.body.content,
        author: {
          connect: { id: props.member.id },
        },
        section: {
          connect: { id: props.body.section_id },
        },
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        articleTags: props.body.tagIds
          ? {
              create: props.body.tagIds.map((tagId) => ({
                id: v4(),
                tag: { connect: { id: tagId } },
                created_at: new Date(),
                updated_at: new Date(),
              })),
            }
          : undefined,
        attachments: props.body.attachmentData
          ? {
              create: props.body.attachmentData.map((att) => ({
                id: v4(),
                file_url: att.file_url,
                file_name: att.file_name,
                file_type: att.file_type,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
                article: { connect: { id: articleId } },
              })),
            }
          : undefined,
      },
      select: {
        id: true,
        title: true,
        content: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        author: {
          select: {
            id: true,
            user_id: true,
            grade: true,
            promoted_by_user_id: true,
            promoted_at: true,
            created_at: true,
            updated_at: true,
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
        attachments: {
          select: {
            id: true,
            file_url: true,
            file_name: true,
            file_type: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            article: {
              select: {
                id: true,
                title: true,
                author: {
                  select: {
                    id: true,
                    user_id: true,
                    grade: true,
                    promoted_by_user_id: true,
                    promoted_at: true,
                    created_at: true,
                    updated_at: true,
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
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        articleTags: {
          select: {
            tag: {
              select: {
                id: true,
                name: true,
                created_at: true,
                updated_at: true,
              },
            },
          },
        },
      },
    });
  const authorSummary: IEconomicPoliticalBoardAdministratorRole.ISummary = {
    id: created.author.id,
    userId: created.author.user_id,
    user: {
      id: created.author.user_id,
      email: "user@example.com",
      displayName: "User",
      bio: "",
    },
    grade: typia.assert<
      IEconomicPoliticalBoardAdministratorRole.ISummary["grade"]
    >(created.author.grade),
    promotedByUserId: created.author.promoted_by_user_id ?? null,
    promotedAt: created.author.promoted_at
      ? toISOStringSafe(created.author.promoted_at)
      : null,
    createdAt: toISOStringSafe(created.author.created_at),
    updatedAt: toISOStringSafe(created.author.updated_at),
  };
  const sectionSummary: IEconomicPoliticalBoardSection.ISummary = {
    id: created.section.id,
    name: created.section.name,
    description: created.section.description,
    created_at: toISOStringSafe(created.section.created_at),
    articleCount: 0,
  };
  const attachments: IEconomicPoliticalBoardAttachment[] =
    created.attachments.map(
      (att: {
        id: string;
        file_url: string;
        file_name: string;
        file_type: string;
        created_at: Date;
        updated_at: Date;
        deleted_at: Date | null;
        article: {
          id: string;
          title: string;
          author: {
            id: string;
            user_id: string;
            grade: string;
            promoted_by_user_id: string | null;
            promoted_at: Date | null;
            created_at: Date;
            updated_at: Date;
          };
          section: {
            id: string;
            name: string;
            description: string | null;
            created_at: Date;
          };
          created_at: Date;
          updated_at: Date;
          deleted_at: Date | null;
        };
      }) => {
        const articleSummary: IEconomicPoliticalBoardArticle.ISummary = {
          id: att.article.id,
          title: att.article.title,
          author: {
            id: att.article.author.id,
            userId: att.article.author.user_id,
            user: {
              id: att.article.author.user_id,
              email: "user@example.com",
              displayName: "User",
              bio: "",
            },
            grade: typia.assert<
              IEconomicPoliticalBoardArticle.ISummary["author"]["grade"]
            >(att.article.author.grade),
            promotedByUserId: att.article.author.promoted_by_user_id ?? null,
            promotedAt: att.article.author.promoted_at
              ? toISOStringSafe(att.article.author.promoted_at)
              : null,
            createdAt: toISOStringSafe(att.article.author.created_at),
            updatedAt: toISOStringSafe(att.article.author.updated_at),
          },
          section: {
            id: att.article.section.id,
            name: att.article.section.name,
            description: att.article.section.description,
            created_at: toISOStringSafe(att.article.section.created_at),
            articleCount: 0,
          },
          created_at: toISOStringSafe(att.article.created_at),
          updated_at: toISOStringSafe(att.article.updated_at),
          deleted_at: att.article.deleted_at
            ? toISOStringSafe(att.article.deleted_at)
            : null,
        };
        return {
          id: att.id,
          file_url: att.file_url,
          file_name: att.file_name,
          file_type: att.file_type,
          created_at: toISOStringSafe(att.created_at),
          updated_at: toISOStringSafe(att.updated_at),
          deleted_at: att.deleted_at ? toISOStringSafe(att.deleted_at) : null,
          article: articleSummary,
        };
      },
    );
  const tagSummaries: IEconomicPoliticalBoardTag.ISummary[] =
    created.articleTags.map(
      (at: {
        tag: {
          id: string;
          name: string;
          created_at: Date;
          updated_at: Date;
        };
      }) => ({
        id: at.tag.id,
        name: at.tag.name,
        created_at: toISOStringSafe(at.tag.created_at),
        updated_at: toISOStringSafe(at.tag.updated_at),
      }),
    );
  const response: IEconomicPoliticalBoardArticle = {
    id: created.id,
    title: created.title,
    content: created.content,
    author: authorSummary,
    section: sectionSummary,
    attachments: attachments,
    tags: tagSummaries,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
  return response;
}
