import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_administrator_capability } from "../prepare/prepare_random_discussion_board_administrator_capability";

export async function generate_random_discussion_board_super_admin_administrators_capabilities_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAdministratorCapability.ICreate>;
    params: {
      administratorId: string;
    };
  },
): Promise<IDiscussionBoardAdministratorCapability> {
  const prepared: IDiscussionBoardAdministratorCapability.ICreate =
    prepare_random_discussion_board_administrator_capability(props.body);
  const result: IDiscussionBoardAdministratorCapability =
    await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
      connection,
      {
        administratorId: props.params.administratorId,
        body: prepared,
      },
    );
  return result;
}
