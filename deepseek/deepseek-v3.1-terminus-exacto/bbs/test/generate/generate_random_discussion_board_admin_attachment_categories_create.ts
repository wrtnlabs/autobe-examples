import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_attachment_category } from "../prepare/prepare_random_discussion_board_attachment_category";

export async function generate_random_discussion_board_admin_attachment_categories_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IDiscussionBoardAttachmentCategory.ICreate> | undefined;
  },
): Promise<IDiscussionBoardAttachmentCategory> {
  const prepared: IDiscussionBoardAttachmentCategory.ICreate =
    prepare_random_discussion_board_attachment_category(props.body);
  const result: IDiscussionBoardAttachmentCategory =
    await api.functional.discussionBoard.admin.attachment_categories.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
