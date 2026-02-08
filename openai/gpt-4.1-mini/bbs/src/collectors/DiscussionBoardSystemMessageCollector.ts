import { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardSystemMessageCollector {
  export async function collect(props: {
    body: IDiscussionBoardSystemMessage.ICreate;
  }) {
    return {
      id: v4(),
      code: "",
      message_text: "",
      message_type: "",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.discussion_board_system_messagesCreateInput;
  }
}
