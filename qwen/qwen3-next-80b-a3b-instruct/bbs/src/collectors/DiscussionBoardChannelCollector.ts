import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardChannel";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardChannelCollector {
  export async function collect(props: {
    body: IDiscussionBoardChannel.ICreate;
  }) {
    return {
      id: v4(),
      name: props.body.name,
      description: props.body.description ?? null,
      visibility_flag: props.body.visibility === "published",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      discussion_board_posts: undefined,
      discussion_board_audit_events: undefined,
    } satisfies Prisma.discussion_board_channelsCreateInput;
  }
}
