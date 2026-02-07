import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
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
        name: "Section Name",
        status: "active",
        display_order: 0,
      },
      author: {
        id: input.discussion_board_user_id,
        display_name: "Author Name",
        bio: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      article: {
        id: "",
        title: "",
        status: "",
        created_at: "",
        author: {
          id: "",
          display_name: "",
          bio: null,
          created_at: "",
          updated_at: "",
        },
        section: {
          id: "",
          name: "",
          status: "active",
          display_order: 0,
        },
      },
      created_at: input.created_at.toISOString(),
    };
  }
}
