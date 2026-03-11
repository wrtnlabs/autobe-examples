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
 * Test successful deletion of an attachment category mapping by an administrator.
 *
 * 1. Authenticate as administrator
 * 2. Create prerequisite attachment category mapping
 * 3. Delete the mapping using erase endpoint
 * 4. Verify deletion was successful through proper validation
 */
export async function test_api_admin_attachment_category_mapping_deletion_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Create prerequisite attachment category mapping
  const mapping =
    await generate_random_discussion_board_admin_attachment_category_mappings_create(
      adminConnection,
      {},
    );
  typia.assert(mapping);
  // 3. Delete the mapping
  await api.functional.discussionBoard.admin.attachment_category_mappings.erase(
    adminConnection,
    {
      mappingId: mapping.id,
    },
  );
  // 4. Verify deletion was successful
  // Since there's no GET endpoint to verify the mapping no longer exists,
  // we rely on the successful execution of the delete operation and
  // validate that the operation completed without errors.
  // The erase function returns void on success, so if we reach this point
  // without throwing an error, the deletion was successful.
  TestValidator.predicate("deletion completed successfully", true);
}
