import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleSnapshotAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        discussion_board_member_id: true,
        discussion_board_section_id: true,
        title: true,
        body: true,
        tags: true,
        file_count: true,
        image_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        discussionBoardArticle: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_articlesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot.ISummary> {
    return {
      id: input.id,
      title: input.title,
      author: {
        id: input.discussion_board_member_id,
      } as IDiscussionBoardMember.ISummary,
      section: {
        id: input.discussion_board_section_id,
      } as IDiscussionBoardSection.ISummary,
      tags: input.tags ?? null,
      file_count: input.file_count,
      image_count: input.image_count,
      created_at: input.created_at.toISOString(),
    };
  }
}
