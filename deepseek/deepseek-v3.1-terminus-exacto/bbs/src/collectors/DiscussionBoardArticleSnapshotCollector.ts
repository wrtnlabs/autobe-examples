import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArticleSnapshotCollector {
  export async function collect(props: {
    body: IDiscussionBoardArticleSnapshot.ICreate;
  }) {
    // Fetch the current article state for denormalization
    const article =
      await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
        where: {
          id: props.body.discussion_board_article_id,
          deleted_at: null, // Only capture non-deleted articles
        },
        select: {
          id: true,
          title: true,
          body: true,
          discussion_board_section_id: true,
          discussion_board_member_id: true,
        },
      });
    return {
      // Generated fields
      id: v4(),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Denormalized fields from article state
      title: article.title,
      body: article.body,
      section_id: article.discussion_board_section_id,
      author_id: article.discussion_board_member_id,
      // DTO provided fields
      snapshot_reason: props.body.snapshot_reason ?? null,
      // Foreign key relation
      article: {
        connect: {
          id: props.body.discussion_board_article_id,
        },
      },
    } satisfies Prisma.discussion_board_article_snapshotsCreateInput;
  }
}
