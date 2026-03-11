import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAttachmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardAttachment.ICreate;
    discussionBoardArticles: IEntity;
    storagePath: string;
  }) {
    const id: string = v4();
    return {
      id,
      filename: props.body.filename,
      filetype: props.body.filetype,
      mime_type: props.body.mime_type,
      size_bytes: props.body.size_bytes,
      storage_path: props.storagePath,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      article: { connect: { id: props.discussionBoardArticles.id } },
    } satisfies Prisma.discussion_board_attachmentsCreateInput;
  }
}
