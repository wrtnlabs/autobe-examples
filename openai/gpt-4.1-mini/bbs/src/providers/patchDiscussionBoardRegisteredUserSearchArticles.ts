import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
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

export async function patchDiscussionBoardRegisteredUserSearchArticles(props: {
  registeredUser: RegistereduserPayload;
  body: IDiscussionBoardArticle.IRequest;
}): Promise<IPageIDiscussionBoardArticle.ISummary> {
  const page =
    typeof (props.body as any).page === "number" && (props.body as any).page > 0
      ? (props.body as any).page
      : 1;
  const limit =
    typeof (props.body as any).limit === "number" &&
    (props.body as any).limit > 0
      ? (props.body as any).limit
      : 10;
  const offset = (page - 1) * limit;
  const prisma = MyGlobal.prisma;
  const text =
    typeof (props.body as any).text === "string" &&
    (props.body as any).text.trim() !== ""
      ? (props.body as any).text.trim()
      : null;
  const tags =
    Array.isArray((props.body as any).tags) &&
    (props.body as any).tags.length > 0
      ? (props.body as any).tags
      : null;
  const textSearchCondition = text
    ? `to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1)`
    : "true";
  const tagsFilterCondition = tags
    ? `exists(
      select 1 from discussion_board_article_tag_mappings
       join discussion_board_tags on discussion_board_article_tag_mappings.discussion_board_tag_id = discussion_board_tags.id
      where discussion_board_article_tag_mappings.discussion_board_article_id = articles.id
        and discussion_board_tags.name = ANY($2::text[])
    )`
    : "true";
  const articlesQuery = `
    select
      articles.id,
      articles.registered_user_id,
      articles.section_id,
      articles.title,
      articles.content,
      articles.created_at,
      articles.updated_at,
      articles.deleted_at,
      coalesce(array(
        select discussion_board_tags.name
        from discussion_board_article_tag_mappings
        join discussion_board_tags on discussion_board_article_tag_mappings.discussion_board_tag_id = discussion_board_tags.id
        where discussion_board_article_tag_mappings.discussion_board_article_id = articles.id
      ), '{}') as tag_names
    from discussion_board_articles articles
    where articles.deleted_at is null
      and ${textSearchCondition}
      and ${tagsFilterCondition}
    order by articles.created_at desc
    limit $3 offset $4
  `;
  const countQuery = `
    select count(*) as count from discussion_board_articles articles
    where articles.deleted_at is null
      and ${textSearchCondition}
      and ${tagsFilterCondition}
  `;
  const articlesRaw = (await prisma.$queryRawUnsafe(
    articlesQuery,
    text ?? "",
    tags ?? [],
    limit,
    offset,
  )) as {
    id: string & tags.Format<"uuid">;
    registered_user_id: string & tags.Format<"uuid">;
    section_id: string & tags.Format<"uuid">;
    title: string;
    content: string;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
    deleted_at: (string & tags.Format<"date-time">) | null;
    tag_names: string[] | null;
  }[];
  const countRaw = (await prisma.$queryRawUnsafe(
    countQuery,
    text ?? "",
    tags ?? [],
  )) as {
    count: string;
  }[];
  const totalRecords =
    countRaw.length === 1 ? parseInt(countRaw[0].count, 10) : 0;
  const data = articlesRaw.map((record) => {
    const tagsList = record.tag_names ?? [];
    return {
      id: record.id,
      registered_user_id: record.registered_user_id,
      section_id: record.section_id,
      title: record.title,
      content: record.content,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
      tags: tagsList,
    };
  });
  const pagination = {
    current: page,
    limit,
    records: totalRecords,
    pages: totalRecords === 0 ? 0 : Math.ceil(totalRecords / limit),
  };
  return {
    pagination,
    data,
  };
}
