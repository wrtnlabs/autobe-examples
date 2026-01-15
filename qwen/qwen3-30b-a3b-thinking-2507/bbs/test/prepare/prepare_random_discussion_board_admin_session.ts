import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IDiscussionBoardAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminSession";
export function prepare_random_discussion_board_admin_session(
  input?: DeepPartial<IDiscussionBoardAdminSession.ICreate>,
): IDiscussionBoardAdminSession.ICreate {
  return {
    device_info:
      input?.device_info ??
      RandomGenerator.paragraph({
        sentences:
          typia.random<number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<5>>(),
      }),
    ip: input?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    user_agent:
      input?.user_agent ??
      `Mozilla/5.0 (${RandomGenerator.pick(["Windows NT 10.0", "Macintosh; Intel Mac OS X 10_15_7", "Linux x86_64"] as const)}) AppleWebKit/${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<999>>().toString()}.36 (KHTML, like Gecko) ${RandomGenerator.pick(["Chrome", "Safari"] as const)}/${typia.random<number & tags.Type<"uint32"> & tags.Minimum<100> & tags.Maximum<200>>().toString()}.0.0.0 ${RandomGenerator.pick(["Safari", "Firefox"] as const)}/537.36`,
  };
}