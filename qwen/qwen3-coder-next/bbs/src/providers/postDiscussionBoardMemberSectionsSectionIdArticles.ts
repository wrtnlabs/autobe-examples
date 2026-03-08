import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function postDiscussionBoardMemberSectionsSectionIdArticles(props: {
  member: MemberPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  const section = await MyGlobal.prisma.discussion_board_sections.findUnique({
    where: {
      id: props.sectionId,
      deleted_at: null,
    },
  });
  if (!section) {
    throw new HttpException("Section not found or deleted", 404);
  }
  const article = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: v4(),
      title: props.body.title,
      content: props.body.content,
      created_at: new Date(),
      author: {
        connect: {
          id: props.member.id,
        },
      },
      section: {
        connect: {
          id: props.sectionId,
        },
      },
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
          updated_at: true,
          deleted_at: true,
        },
      },
      files: {
        select: {
          id: true,
          file_name: true,
          file_url: true,
          file_size: true,
          file_type: true,
          uploaded_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      taggings: {
        select: {
          id: true,
          created_at: true,
          article: {
            select: {
              id: true,
              title: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
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
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
        },
      },
    },
  });
  return typia.assert<IDiscussionBoardArticle>({
    id: article.id,
    title: article.title,
    content: article.content,
    created_at: toISOStringSafe(article.created_at),
    updated_at: article.updated_at ? toISOStringSafe(article.updated_at) : null,
    deleted_at: article.deleted_at ? toISOStringSafe(article.deleted_at) : null,
    author: {
      id: article.author.id,
      display_name: article.author.display_name,
      bio: article.author.bio,
    },
    section: {
      id: article.section.id,
      name: article.section.name,
      description: article.section.description,
      created_at: toISOStringSafe(article.section.created_at),
      updated_at: toISOStringSafe(article.section.updated_at),
      deleted_at: article.section.deleted_at
        ? toISOStringSafe(article.section.deleted_at)
        : null,
      article_count: 0,
    },
    files: article.files.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_url: file.file_url,
      file_size: file.file_size,
      file_type: file.file_type,
      uploaded_at: toISOStringSafe(file.uploaded_at),
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
      deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    })),
    taggings: article.taggings.map((tagging) => ({
      id: tagging.id,
      created_at: toISOStringSafe(tagging.created_at),
      article: {
        id: tagging.article.id,
        title: tagging.article.title,
        created_at: toISOStringSafe(tagging.article.created_at),
        updated_at: tagging.article.updated_at
          ? toISOStringSafe(tagging.article.updated_at)
          : null,
        deleted_at: tagging.article.deleted_at
          ? toISOStringSafe(tagging.article.deleted_at)
          : null,
        author: {
          id: tagging.article.author.id,
          display_name: tagging.article.author.display_name,
          bio: tagging.article.author.bio,
        },
        section: {
          id: tagging.article.section.id,
          name: tagging.article.section.name,
          description: tagging.article.section.description,
          created_at: toISOStringSafe(tagging.article.section.created_at),
          updated_at: toISOStringSafe(tagging.article.section.updated_at),
          deleted_at: tagging.article.section.deleted_at
            ? toISOStringSafe(tagging.article.section.deleted_at)
            : null,
          article_count: 0,
        },
      },
    })),
  });
}
