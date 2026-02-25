import { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardRegisteredUserPasswordResetCollector {
  export async function collect(props: {
    body: IDiscussionBoardRegisteredUserPasswordReset.ICreate;
    registeredUser: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      token: props.body.token,
      expired_at: new Date(props.body.expired_at),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      registeredUser: { connect: { id: props.registeredUser.id } },
    } satisfies Prisma.discussion_board_registered_user_password_resetsCreateInput;
  }
}
