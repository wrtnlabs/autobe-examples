import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTagMapping";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleTagMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTagMapping";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticleTagMappings(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticleTagMapping.IRequest;
}): Promise<IPageIDiscussionBoardArticleTagMapping.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 50;
  const skip = (page - 1) * limit;
  const where: Prisma.discussion_board_article_tag_mappingsWhereInput = {};
  if (props.body.articleId) {
    where.discussion_board_article_id = props.body.articleId;
  }
  if (props.body.tagId) {
    where.discussion_board_tag_id = props.body.tagId;
  }
  let orderBy: Prisma.discussion_board_article_tag_mappingsOrderByWithRelationInput[] =
    [];
  if (props.body.sort) {
    const [field, directionRaw] = props.body.sort.split(" ");
    const direction =
      directionRaw && directionRaw.toLowerCase() === "desc" ? "desc" : "asc";
    switch (field) {
      case "createdAt":
        orderBy.push({ created_at: direction });
        break;
      case "updatedAt":
        orderBy.push({ updated_at: direction });
        break;
      default:
        orderBy.push({ created_at: "desc" });
    }
  } else {
    orderBy = [{ created_at: "desc" }];
  }
  const total =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.count({
      where,
    });
  const records =
    await MyGlobal.prisma.discussion_board_article_tag_mappings.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        discussion_board_article_id: true,
        discussion_board_tag_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: {
          select: {
            id: true,
            title: true,
            registered_user_id: true,
            section_id: true,
            created_at: true,
          },
        },
        tag: {
          select: {
            id: true,
            name: true,
            created_at: true,
          },
        },
      },
    });
  const data = records.map((record) => ({
    id: record.id,
    discussionBoardArticleId: record.discussion_board_article_id,
    discussionBoardTagId: record.discussion_board_tag_id,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    article: {
      id: record.article.id,
      title: record.article.title,
      displayName: record.article.title,
      author: {
        id: record.article.registered_user_id ?? "",
        email: "",
        displayName: "",
        isBanned: false,
        createdAt: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
        updatedAt: "1970-01-01T00:00:00.000Z" satisfies string &
          tags.Format<"date-time"> as string & tags.Format<"date-time">,
      },
      section: {
        id: record.article.section_id,
      },
      createdAt: toISOStringSafe(record.article.created_at),
      commentCount: 0,
      tags: [],
    },
    tag: {
      id: record.tag.id,
      name: record.tag.name,
      createdAt: toISOStringSafe(record.tag.created_at),
    },
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
