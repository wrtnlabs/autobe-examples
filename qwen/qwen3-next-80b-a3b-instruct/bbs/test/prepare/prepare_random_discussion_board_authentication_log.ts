import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAuthenticationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthenticationLog";
export function prepare_random_discussion_board_authentication_log(
  input?: DeepPartial<IDiscussionBoardAuthenticationLog.ICreate>,
): IDiscussionBoardAuthenticationLog.ICreate {
  return {
    authentication_type:
      input?.authentication_type ??
      RandomGenerator.pick(["login", "logout", "failed_login"] as const),
    ip_address:
      input?.ip_address ?? typia.random<string & tags.Format<"ipv4">>(),
    user_agent:
      input?.user_agent ??
      RandomGenerator.content({
        paragraphs: 1,
        sentenceMin: 1,
        sentenceMax: 1,
        wordMin: 5,
        wordMax: 10,
      }),
  };
}
