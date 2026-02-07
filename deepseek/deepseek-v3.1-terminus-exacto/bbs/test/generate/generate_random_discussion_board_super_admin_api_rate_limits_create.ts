import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
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
): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const prepared: IDiscussionBoardApiRateLimit.ICreate =
    prepare_random_discussion_board_api_rate_limit(props.body);
  const result: IPageIDiscussionBoardApiRateLimit.ISummary =
    await api.functional.discussionBoard.superAdmin.api_rate_limits.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
