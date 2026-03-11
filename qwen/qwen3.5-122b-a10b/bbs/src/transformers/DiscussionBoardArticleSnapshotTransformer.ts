import { IDiscussionBoardArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardArticleSnapshotTransformer {
  export type Payload = Prisma.discussion_board_article_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleSnapshot> {
    return {
      id: input.id,
      discussion_board_article_id: input.discussionBoardArticle.id,
      discussion_board_section_id: input.discussion_board_section_id,
      discussion_board_member_id: input.discussion_board_member_id,
      title: input.title,
      body: input.body,
      tags: input.tags ?? null,
      file_count: input.file_count,
      image_count: input.image_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        discussion_board_section_id: true,
        discussion_board_member_id: true,
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
}
