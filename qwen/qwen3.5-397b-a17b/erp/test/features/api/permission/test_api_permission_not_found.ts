import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving a permission with a non-existent UUID.
 *
 * Validates that the system properly handles requests for permissions that do not exist in the database. This test ensures that when a member attempts to retrieve a permission using a valid UUID format that does not correspond to any existing permission record, the system returns a 404 Not Found response instead of exposing internal errors or returning invalid data.
 *
 * 1. Member registers with email and password credentials.
 * 2. Generate a random UUID that does not exist in the system.
 * 3. Attempt to retrieve permission using the non-existent UUID.
 * 4. Validate that the API returns 404 Not Found status code.
 */
export async function test_api_permission_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Generate non-existent permission UUID
  const nonExistentPermissionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent permission and validate 404
  await TestValidator.httpError(
    "permission not found returns 404",
    404,
    async () => {
      await api.functional.hrmPlatform.member.permissions.at(memberConnection, {
        permissionId: nonExistentPermissionId,
      });
    },
  );
}
