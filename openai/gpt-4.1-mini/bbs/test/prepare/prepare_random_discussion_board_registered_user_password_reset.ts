import { IDiscussionBoardRegisteredUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_registered_user_password_reset(
  input?: DeepPartial<IDiscussionBoardRegisteredUserPasswordReset.ICreate>,
): IDiscussionBoardRegisteredUserPasswordReset.ICreate {
  return {
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
    expired_at:
      input?.expired_at ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
