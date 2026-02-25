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

/**
 * Generate a random administrator-section assignment.
 *
 * Creates a new administrator assignment to a section by calling the
 * discussion board admin sections administrators create API.
 *
 * @param connection API connection with admin authentication
 * @param props Function parameters
 * @param props.body Optional partial data for the assignment (mutually exclusive admin_id/super_admin_id)
 * @param props.params URL parameters containing sectionId
 * @returns Created administrator-section assignment record
 */
export async function generate_random_discussion_board_admin_sections_administrators_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSuperAdmin.ICreate>;
    params: {
      sectionId: string;
    };
  },
): Promise<IDiscussionBoardSuperAdmin> {
  const prepared: IDiscussionBoardSuperAdmin.ICreate =
    prepare_random_discussion_board_super_admin(props.body);
  const result: IDiscussionBoardSuperAdmin =
    await api.functional.discussionBoard.admin.sections.administrators.create(
      connection,
      {
        sectionId: props.params.sectionId,
        body: prepared,
      },
    );
  return result;
}
