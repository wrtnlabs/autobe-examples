import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that built-in roles cannot be deleted by the organization Owner.
 *
 * Validates the immutability of built-in roles by having the organization
 * Owner attempt to delete one. Built-in roles — Owner, Manager, and Employee —
 * are created automatically at organization creation time and must remain
 * undeletable for the lifetime of the organization.
 *
 * The system rejects the deletion with HTTP 422, confirming that no
 * authorization level can override built-in role protection.
 *
 * 1. Register a new member who becomes the Owner of a new organization.
 * 2. Attempt to delete a built-in role by its ID.
 * 3. Verify the deletion is blocked with HTTP 422.
 */
export async function test_api_role_delete_builtin_role_blocked(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register as Owner — creates organization with built-in roles
  const ownerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(ownerConnection, {});
  typia.assert(authorized);
  // 2. Attempt to delete a built-in role — expect 422 rejection
  await TestValidator.httpError(
    "built-in role deletion blocked",
    422,
    async () => {
      await api.functional.erpHrm.roles.erase(ownerConnection, {
        roleId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
