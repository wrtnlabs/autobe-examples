import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_super_admin } from "../prepare/prepare_random_discussion_board_super_admin";

export async function generate_random_discussion_board_super_admin_sections_administrators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSuperAdmin.ICreate>;
    params?: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSuperAdmin> {
  const prepared: IDiscussionBoardSuperAdmin.ICreate =
    prepare_random_discussion_board_super_admin(props.body);
  const result: IDiscussionBoardSuperAdmin =
    await api.functional.discussionBoard.superAdmin.sections.administrators.create(
      connection,
      {
        sectionId: props.params?.sectionId ?? "",
        body: prepared,
      },
    );
  return result;
}
