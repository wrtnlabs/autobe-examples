import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace DiscussionBoardRegisteredUserEmailVerificationCollector {
  export async function collect(props: {
    body: IDiscussionBoardRegisteredUserEmailVerification.ICreate;
  }) {
    const id = v4();
    return {
      id,
      token: props.body.token,
      expired_at: new Date(props.body.expiredAt),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      registeredUser: { connect: { id: props.body.registeredUserId } },
    } satisfies Prisma.discussion_board_registered_user_email_verificationsCreateInput;
  }
}
