import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArchive";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardArchiveCollector {
  export async function collect(props: {
    body: IDiscussionBoardArchive.ICreate;
  }) {
    return {
      id: v4(),
      content_type: props.body.source_type,
      content_id: props.body.source_content_id,
      content_data: props.body.content,
      created_at: new Date(),
      updated_at: new Date(),
      archived_by: null,
      archived_at: new Date(),
      reason: props.body.reason,
      archive_reason_code: "",
      post: undefined,
      comment: undefined,
      image: undefined,
      file: undefined,
    } satisfies Prisma.discussion_board_archivesCreateInput;
  }
}
