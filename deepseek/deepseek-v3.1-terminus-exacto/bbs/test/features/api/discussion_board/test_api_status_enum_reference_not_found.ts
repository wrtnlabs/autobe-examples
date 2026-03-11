import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test error handling when attempting to retrieve a non-existent status enumeration reference relationship.
 * This scenario validates that the system properly handles cases where the specified reference ID does not exist
 * in the database. The test authenticates as a super administrator and attempts to retrieve a reference using
 * valid UUID format IDs that do not correspond to any existing records.
 */
export async function test_api_status_enum_reference_not_found(
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
  // Generate valid UUIDs for non-existent records
  const statusEnumId = typia.random<string & tags.Format<"uuid">>();
  const referenceId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent status enumeration reference
  await TestValidator.error(
    "status enumeration reference not found",
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.references.at(
        superAdminConnection,
        {
          statusEnumId,
          referenceId,
        },
      );
    },
  );
}
