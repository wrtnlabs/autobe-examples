import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test permission not found error handling for non-existent permission UUID.
 *
 * Validates that requesting a permission definition with a valid UUID format that does not exist in the system returns HTTP 404. This ensures proper error differentiation between authentication failures (401/403) and resource not found scenarios (404).
 *
 * The test generates a valid UUID that will not correspond to any system-defined permission in the hrm_permissions table, then attempts to retrieve it. The API should respond with a 404 status code to indicate the permission definition does not exist.
 *
 * 1. Authenticate as member user with email and password credentials.
 * 2. Generate a valid UUID format that does not exist in the database.
 * 3. Request the non-existent permission definition via GET /hrm/member/permissions/{permissionId}.
 * 4. Validate HTTP 404 error response with appropriate error handling.
 */
export async function test_api_permission_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member user
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  // 2. Generate a valid UUID that does not exist in the database
  const nonExistentPermissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Validate that requesting non-existent permission returns HTTP 404
  await TestValidator.httpError(
    "permission not found returns 404",
    404,
    async () => {
      await api.functional.hrm.member.permissions.at(memberConnection, {
        permissionId: nonExistentPermissionId,
      });
    },
  );
}
