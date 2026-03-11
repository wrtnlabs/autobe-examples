import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchDiscussionBoardArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleSnapshot.IRequest;
}): Promise<IPageIDiscussionBoardArticleSnapshot.ISummary> {
  // 1. Verify article exists and is accessible
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true },
  });
  // 2. Build WHERE clause with filters
  const whereInput = {
    discussion_board_article_id: props.articleId,
    deleted_at: null,
    ...(props.body.created_after && {
      created_at: { gt: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lt: new Date(props.body.created_before) },
    }),
    ...(props.body.snapshot_reason && {
      snapshot_reason: { contains: props.body.snapshot_reason },
    }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { body: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.discussion_board_article_snapshotsWhereInput;
  // 3. Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 4. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_article_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        created_at: true,
        snapshot_reason: true,
        section_id: true,
        author_id: true,
        title: true,
        // Join section data
        article: {
          select: {
            section: {
              select: {
                id: true,
                name: true,
                description: true,
                created_at: true,
              },
            } satisfies Prisma.discussion_board_sectionsFindManyArgs,
          },
        },
      },
    }),
    MyGlobal.prisma.discussion_board_article_snapshots.count({
      where: whereInput,
    }),
  ]);
  // 5. Fetch author data in batch
  const authorIds = data
    .map((d) => d.author_id)
    .filter((id, index, arr) => arr.indexOf(id) === index);
  const authors = await MyGlobal.prisma.discussion_board_members.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, display_name: true, bio: true },
  });
  const authorMap = new Map(authors.map((a) => [a.id, a]));
  // 6. Transform to DTO
  const transformedData = await ArrayUtil.asyncMap(data, async (snapshot) => {
    const author = authorMap.get(snapshot.author_id);
    if (!author) {
      throw new HttpException(`Author ${snapshot.author_id} not found`, 404);
    }
    return {
      id: snapshot.id,
      title: snapshot.title,
      created_at: toISOStringSafe(snapshot.created_at) as string &
        tags.Format<"date-time">,
      snapshot_reason: snapshot.snapshot_reason ?? undefined,
      section: {
        id: snapshot.article.section.id,
        name: snapshot.article.section.name,
        description: snapshot.article.section.description,
        created_at: toISOStringSafe(
          snapshot.article.section.created_at,
        ) as string & tags.Format<"date-time">,
      } satisfies IDiscussionBoardSection.ISummary,
      author: {
        id: author.id,
        display_name: author.display_name,
        bio: author.bio ?? undefined,
      } satisfies IDiscussionBoardMember.ISummary,
    } satisfies IDiscussionBoardArticleSnapshot.ISummary;
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticleSnapshot.ISummary;
}
