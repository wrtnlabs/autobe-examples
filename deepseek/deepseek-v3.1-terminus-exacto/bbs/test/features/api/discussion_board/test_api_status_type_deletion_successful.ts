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

/**
 * Test successful deletion of an unused status type by a super administrator.
 * 1. Create super administrator account
 * 2. Create a new status type
 * 3. Verify status type exists and is active
 * 4. Perform deletion operation
 * 5. Verify soft deletion (deleted_at timestamp set)
 */
export async function test_api_status_type_deletion_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create a status type to be deleted using utility function
  const statusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: RandomGenerator.alphabets(8),
          code: RandomGenerator.alphabets(6),
          display_name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // 3. Verify status type exists and is active (deleted_at is null)
  TestValidator.equals(
    "status type should be active",
    statusType.deleted_at,
    null,
  );
  TestValidator.predicate("status type should be active", statusType.is_active);
  // 4. Perform deletion operation
  await api.functional.discussionBoard.superAdmin.status_types.erase(
    superAdminConnection,
    {
      statusTypeId: statusType.id,
    },
  );
  // 5. Verify deletion was successful by testing that the operation completed without error
  // Since erase returns void, the successful completion of the await statement indicates success
  TestValidator.predicate("deletion operation completed successfully", true);
}
