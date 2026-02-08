import { IDiscussionBoardCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardCommentSnapshotCollector {
  export async function collect(props: {
    body: IDiscussionBoardCommentSnapshot.ICreate;
    comment: IEntity;
  }) {
    return {
      id: v4(),
      body: JSON.stringify(props.body),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      comment: {
        connect: { id: props.comment.id },
      },
    } satisfies Prisma.discussion_board_comment_snapshotsCreateInput;
  }
}
