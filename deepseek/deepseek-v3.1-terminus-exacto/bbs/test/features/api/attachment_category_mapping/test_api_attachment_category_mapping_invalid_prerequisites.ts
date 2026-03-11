import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_attachment_category_mappings_create } from "../../../generate/generate_random_discussion_board_admin_attachment_category_mappings_create";
import { prepare_random_discussion_board_attachment_category_mapping } from "../../../prepare/prepare_random_discussion_board_attachment_category_mapping";

/**
 * Test validation of prerequisite attachment and category existence.
 * Attempt to create mapping with non-existent attachment ID or category ID.
 * Verify the system rejects the request with appropriate validation errors.
 * Tests business logic validation when referenced entities do not exist.
 */
export async function test_api_attachment_category_mapping_invalid_prerequisites(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test: Non-existent attachment ID with valid UUID format
  await TestValidator.error(
    "should reject mapping with non-existent attachment ID",
    async () => {
      await api.functional.discussionBoard.admin.attachment_category_mappings.create(
        adminConnection,
        {
          body: {
            discussion_board_attachment_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            discussion_board_attachment_category_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
        },
      );
    },
  );
  // Test: Non-existent category ID with valid UUID format
  await TestValidator.error(
    "should reject mapping with non-existent category ID",
    async () => {
      await api.functional.discussionBoard.admin.attachment_category_mappings.create(
        adminConnection,
        {
          body: {
            discussion_board_attachment_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            discussion_board_attachment_category_id: typia.random<
              string & tags.Format<"uuid">
            >(),
          } satisfies IDiscussionBoardAttachmentCategoryMapping.ICreate,
        },
      );
    },
  );
}
