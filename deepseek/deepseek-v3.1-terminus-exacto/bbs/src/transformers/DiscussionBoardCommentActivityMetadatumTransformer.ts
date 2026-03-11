import { IDiscussionBoardCommentActivityMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentActivityMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardCommentActivityMetadatumTransformer {
  export type Payload =
    Prisma.discussion_board_comment_activity_metadataGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        key: true,
        value: true,
        commentActivity: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_comment_activitiesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_comment_activity_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardCommentActivityMetadatum> {
    return {
      id: input.id,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      key: input.key,
      value: input.value,
      discussion_board_comment_activity_id: input.commentActivity.id,
    };
  }
}
