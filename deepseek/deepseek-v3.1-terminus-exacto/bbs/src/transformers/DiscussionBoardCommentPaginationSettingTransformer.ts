import { IDiscussionBoardCommentPaginationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentPaginationSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentPaginationSettingTransformer {
  export type Payload =
    Prisma.discussion_board_comment_pagination_settingsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        comments_per_page: true,
        total_comment_count: true,
        last_comment_count_update: true,
        created_at: true,
        updated_at: true,
        article: true,
      },
    } satisfies Prisma.discussion_board_comment_pagination_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentPaginationSetting> {
    return {
      id: input.id,
      comments_per_page: input.comments_per_page,
      total_comment_count: input.total_comment_count,
      last_comment_count_update: input.last_comment_count_update.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
