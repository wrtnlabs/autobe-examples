import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategory";
import type { IDiscussionBoardAttachmentCategoryMapping } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCategoryMapping";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_discussion_board_attachment_category_mapping } from "../prepare/prepare_random_discussion_board_attachment_category_mapping";

export async function generate_random_discussion_board_super_admin_attachment_category_mappings_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IDiscussionBoardAttachmentCategoryMapping.ICreate>
      | undefined;
  },
): Promise<IDiscussionBoardAttachmentCategoryMapping> {
  const prepared: IDiscussionBoardAttachmentCategoryMapping.ICreate =
    prepare_random_discussion_board_attachment_category_mapping(props.body);
  return await api.functional.discussionBoard.superAdmin.attachment_category_mappings.create(
    connection,
    {
      body: prepared,
    },
  );
}
