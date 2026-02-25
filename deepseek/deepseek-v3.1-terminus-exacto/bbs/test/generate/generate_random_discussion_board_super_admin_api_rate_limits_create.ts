import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_api_rate_limit } from "../prepare/prepare_random_discussion_board_api_rate_limit";

export async function generate_random_discussion_board_super_admin_api_rate_limits_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardApiRateLimit.ICreate>;
  },
): Promise<IDiscussionBoardApiRateLimit> {
  const prepared: IDiscussionBoardApiRateLimit.ICreate =
    prepare_random_discussion_board_api_rate_limit(props.body);
  const result: IDiscussionBoardApiRateLimit =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
