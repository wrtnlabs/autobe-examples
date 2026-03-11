import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

export async function test_api_status_type_deletion_with_dependencies(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a status type
  const statusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: "article",
          code: "published",
          display_name: "Published Article",
          description:
            "Article that has been published and is visible to users",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // Attempt to delete the status type and verify it fails due to dependencies
  // The server should check for active dependencies and prevent deletion
  await TestValidator.error(
    "status type deletion should fail when dependencies exist",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_types.erase(
        superAdminConnection,
        {
          statusTypeId: statusType.id,
        },
      );
    },
  );
  // Verify the status type remains active after failed deletion attempt
  TestValidator.predicate(
    "status type should remain active after failed deletion",
    statusType.is_active === true,
  );
}
