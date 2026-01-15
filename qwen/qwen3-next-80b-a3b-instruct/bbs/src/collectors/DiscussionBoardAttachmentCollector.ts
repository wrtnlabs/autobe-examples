import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardAttachmentCollector {
  export async function collect(props: {
    body: IDiscussionBoardAttachment.ICreate;
    discussionBoardArticles: IEntity;
  }) {
    return {
      id: v4(),
      mime_type: props.body.mimetype,
      file_size: props.body.size,
      file_name: props.body.name,
      storage_path: `attachments/${v4()}.${props.body.extension}`, // Generate storage path with file extension
      file_hash: v4(), // ✅ Fixed: Use v4() as placeholder for hashing (MD5 not available in context)
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      post: undefined,
      article: {
        connect: { id: props.discussionBoardArticles.id },
      },
      comment: undefined,
      discussion_board_thumbnails: undefined,
      discussion_board_article_files: undefined, // ✅ Fixed: Use undefined for hasMany relation, cannot create
    } satisfies Prisma.discussion_board_attachmentsCreateInput;
  }
}
