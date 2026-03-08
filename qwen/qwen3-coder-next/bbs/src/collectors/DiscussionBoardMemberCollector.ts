import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardMemberCollector {
  export async function collect(props: {
    body: IDiscussionBoardMember.ICreate;
  }) {
    const id: string = v4();
    return {
      id,
      email: props.body.email,
      password_hash: props.body.password_hash,
      display_name: props.body.display_name,
      bio: props.body.bio ?? null,
      role: "member",
      is_banned: false,
      ban_reason: null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      sessions: undefined,
      memberPasswordResets: undefined,
      articles: undefined,
      administratorRequests: undefined,
      banRecords: undefined,
    } satisfies Prisma.discussion_board_membersCreateInput;
  }
}
