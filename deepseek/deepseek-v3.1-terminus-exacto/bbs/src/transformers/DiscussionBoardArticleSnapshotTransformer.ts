import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleSnapshotTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        title: true,
        content: true,
        discussion_board_section_id: true,
        discussion_board_user_id: true,
        created_at: true,
        article: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot> {
    return {
      id: input.id,
      title: input.title,
      content: input.content,
      section: {
        id: input.discussion_board_section_id,
        name: "",
        description: "",
        status: "",
        display_order: 0,
        deleted_at: undefined,
      } satisfies IDiscussionBoardSection.ISummary,
      author: {
        id: input.discussion_board_user_id,
        display_name: "",
        bio: undefined,
        created_at: toISOStringSafe(new Date()),
      } satisfies IDiscussionBoardUser.ISummary,
      created_at: toISOStringSafe(input.created_at),
      article_id: input.article.id,
    };
  }
}
