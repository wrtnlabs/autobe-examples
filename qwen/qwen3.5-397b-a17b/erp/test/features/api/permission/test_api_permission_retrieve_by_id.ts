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
 * Test retrieving a single permission record by its unique identifier.
 *
 * Validates the complete permission retrieval flow including member authentication and querying an existing permission using a valid UUID. Ensures that the response includes all required fields: id, code (in domain:action format), description, created_at, updated_at, and deleted_at.
 *
 * Special attention is given to verifying that the permission code follows the expected 'domain:action' format (e.g., org:manage, employee:view) and that the description is a non-empty human-readable string explaining the permission's purpose.
 *
 * 1. Member registers with email and credentials to obtain authentication.
 * 2. Generate a valid UUID for the permission ID parameter.
 * 3. Retrieve the permission record using the authenticated member connection.
 * 4. Validate response structure and field formats including code pattern and description presence.
 */
export async function test_api_permission_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  // 2. Generate permission ID
  const permissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve permission
  const permission: IHrmPlatformPermission =
    await api.functional.hrmPlatform.member.permissions.at(memberConnection, {
      permissionId,
    });
  typia.assert(permission);
  // 4. Validate business logic
  TestValidator.predicate(
    "code follows domain:action format",
    permission.code.split(":").length === 2 &&
      permission.code.split(":")[0].length > 0 &&
      permission.code.split(":")[1].length > 0,
  );
  TestValidator.predicate(
    "description is non-empty",
    permission.description.length > 0,
  );
}
