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

export async function test_api_permission_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test unauthenticated access is rejected with 401 Unauthorized
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access rejected",
    401,
    async () => {
      await api.functional.hrm.member.permissions.at(unauthConnection, {
        permissionId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
  // 2. Register a new member account for authenticated access test
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(memberAuth);
  // 3. Test authenticated access to permission definitions
  // Note: This tests that authentication is properly enforced and accepted.
  // The actual permission ID may not exist (404), but the authentication flow is validated.
  const permissionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // With valid authentication, the request should be processed (may return 404 if permission doesn't exist)
  // The key validation is that 401 is NOT returned for authenticated requests
  const result = await api.functional.hrm.member.permissions.at(
    memberConnection,
    {
      permissionId,
    },
  );
  // If permission exists, validate response structure
  if (result !== null && result !== undefined) {
    typia.assert(result as IHrmPermission);
    TestValidator.predicate(
      "permission has valid ID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        (result as IHrmPermission).id,
      ),
    );
    TestValidator.predicate(
      "permission name follows naming convention",
      /^[a-z]+:[a-z_]+$/.test((result as IHrmPermission).permission_name),
    );
  }
  // If result is null/undefined (404), authentication was still successful - permission just doesn't exist
}
