import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardUserCollector {
  export async function collect(props: { body: IDiscussionBoardUser.ICreate }) {
    return {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // Relations that cannot be created during user registration
      discussion_board_posts: undefined,
      discussion_board_moderator: undefined,
      discussion_board_comment_notifications: undefined,
      discussion_board_attachment_files: undefined,
      discussion_board_notification_records: undefined,
      discussion_board_security_logs: undefined,
    } satisfies Prisma.discussion_board_usersCreateInput;
  }
}
