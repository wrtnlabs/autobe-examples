import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
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
import { generate_random_discussion_board_super_admin_status_enums_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_create";
import { generate_random_discussion_board_super_admin_status_enums_references_create } from "../../../generate/generate_random_discussion_board_super_admin_status_enums_references_create";
import { prepare_random_discussion_board_status_enum } from "../../../prepare/prepare_random_discussion_board_status_enum";
import { prepare_random_discussion_board_status_enum_reference } from "../../../prepare/prepare_random_discussion_board_status_enum_reference";

/**
 * Test status enumeration reference creation for admin request status values.
 *
 * This test validates the creation of reference relationships between status enumeration
 * values and domain table columns, specifically for admin request status dependencies.
 * It tests the complete lifecycle of status enumeration reference management including
 * dependency tracking and duplicate prevention logic.
 */
export async function test_api_status_enum_reference_creation_for_admin_request_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a status enumeration value for admin request status
  const statusEnum =
    await generate_random_discussion_board_super_admin_status_enums_create(
      superAdminConnection,
      {
        body: {
          entity_type: "admin_request",
          value: "pending",
          description: "Admin request is pending approval",
          sort_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardStatusEnum.ICreate,
      },
    );
  typia.assert(statusEnum);
  // 3. Create reference relationship for admin request status column
  const reference =
    await generate_random_discussion_board_super_admin_status_enums_references_create(
      superAdminConnection,
      {
        params: {
          statusEnumId: statusEnum.id,
        },
        body: {
          referenced_table: "discussion_board_admin_requests",
          referenced_column: "status",
        } satisfies IDiscussionBoardStatusEnumReference.ICreate,
      },
    );
  typia.assert(reference);
  // 4. Validate reference relationship properties
  TestValidator.equals(
    "status enum ID matches",
    reference.discussion_board_status_enums_id,
    statusEnum.id,
  );
  TestValidator.equals(
    "referenced table matches",
    reference.referenced_table,
    "discussion_board_admin_requests",
  );
  TestValidator.equals(
    "referenced column matches",
    reference.referenced_column,
    "status",
  );
  // 5. Test duplicate prevention - attempt to create same reference again
  await TestValidator.error(
    "duplicate reference creation should fail",
    async () => {
      await generate_random_discussion_board_super_admin_status_enums_references_create(
        superAdminConnection,
        {
          params: {
            statusEnumId: statusEnum.id,
          },
          body: {
            referenced_table: "discussion_board_admin_requests",
            referenced_column: "status",
          } satisfies IDiscussionBoardStatusEnumReference.ICreate,
        },
      );
    },
  );
}
