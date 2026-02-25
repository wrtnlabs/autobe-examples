import { IDiscussionBoardRegisteredUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_registered_user_email_verification(
  input?: DeepPartial<IDiscussionBoardRegisteredUserEmailVerification.ICreate>,
): IDiscussionBoardRegisteredUserEmailVerification.ICreate {
  return {
    registeredUserId:
      input?.registeredUserId ?? typia.random<string & tags.Format<"uuid">>(),
    token: input?.token ?? RandomGenerator.alphaNumeric(32),
    expiredAt:
      input?.expiredAt ?? typia.random<string & tags.Format<"date-time">>(),
  };
}
