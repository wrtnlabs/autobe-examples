import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPoliticsBbsArticleSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";

export async function getPoliticsBbsArticlesArticleIdSnapshots(props: {
  articleId: string & tags.Format<"uuid">;
}): Promise<IPageIPoliticsBbsArticleSnapshot> {
  const { articleId } = props;

  // Verify article exists to provide meaningful error
  const articleExists = await MyGlobal.prisma.politics_bbs_articles.findUnique({
    where: { id: articleId },
  });

  if (!articleExists) {
    throw new HttpException("Article not found", 404);
  }

  // Fetch all snapshots for this article
  const snapshots =
    await MyGlobal.prisma.politics_bbs_article_snapshots.findMany({
      where: { politics_bbs_article_id: articleId },
      orderBy: { created_at: "desc" },
    });

  const total = snapshots.length;

  return {
    data: snapshots.map((snapshot) => ({
      id: snapshot.id as string & tags.Format<"uuid">,
      politics_bbs_article_id: snapshot.politics_bbs_article_id,
      title: snapshot.title,
      content: snapshot.content,
      state: snapshot.state,
      view_count: snapshot.view_count as number & tags.Type<"int32">,
      created_at: toISOStringSafe(snapshot.created_at),
    })),
    pagination: {
      current: 0,
      limit: total,
      records: total,
      pages: 1,
    },
  };
}
