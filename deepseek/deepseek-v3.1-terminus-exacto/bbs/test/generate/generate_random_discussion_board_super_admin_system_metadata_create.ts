import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_system_metadatum } from "../prepare/prepare_random_discussion_board_system_metadatum";

export async function generate_random_discussion_board_super_admin_system_metadata_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardSystemMetadatum.ICreate>;
  },
): Promise<IDiscussionBoardSystemMetadatum> {
  const prepared: IDiscussionBoardSystemMetadatum.ICreate =
    prepare_random_discussion_board_system_metadatum(props.body);
  const result: IDiscussionBoardSystemMetadatum =
    await api.functional.discussionBoard.superAdmin.system_metadata.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
