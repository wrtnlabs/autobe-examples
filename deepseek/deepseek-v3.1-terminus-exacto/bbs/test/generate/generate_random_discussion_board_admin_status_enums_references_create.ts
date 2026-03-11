import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_status_enum_reference } from "../prepare/prepare_random_discussion_board_status_enum_reference";

export async function generate_random_discussion_board_admin_status_enums_references_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardStatusEnumReference.ICreate>;
    params: {
      statusEnumId: string;
    };
  },
): Promise<IDiscussionBoardStatusEnumReference> {
  const prepared: IDiscussionBoardStatusEnumReference.ICreate =
    prepare_random_discussion_board_status_enum_reference(props.body);
  const result: IDiscussionBoardStatusEnumReference =
    await api.functional.discussionBoard.admin.status_enums.references.create(
      connection,
      {
        statusEnumId: props.params.statusEnumId,
        body: prepared,
      },
    );
  return result;
}
