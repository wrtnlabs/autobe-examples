import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test filtering roles by their builtIn status parameter.
 *
 * Authenticates as a member to establish the active organization context required for role filtering. Validates three filtering scenarios: builtIn: true returns only platform default roles (Owner, Manager, Employee), builtIn: false returns only custom roles, and omitting builtIn returns all active roles. Each scenario verifies pagination metadata reflects the filtered result set and that every returned role summary contains the correct builtIn boolean flag matching the filter criteria. Soft-deleted custom roles are automatically excluded from results.
 *
 * 1. Authenticate as a member via join.
 * 2. Query roles with builtIn: true.
 * 3. Validate all returned roles have builtIn: true.
 * 4. Query roles with builtIn: false.
 * 5. Validate all returned roles have builtIn: false.
 * 6. Query roles with omitted builtIn parameter.
 * 7. Validate pagination records match the sum of built-in and custom roles.
 */
export async function test_api_role_filter_by_built_in_status(
  connection: api.IConnection,
) {
  // 1. Authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Filter by builtIn: true
  const builtInRoles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        builtIn: true,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(builtInRoles);
  for (const role of builtInRoles.data) {
    TestValidator.equals("builtIn role flag is true", role.builtIn, true);
  }
  // 3. Filter by builtIn: false
  const customRoles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        builtIn: false,
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(customRoles);
  for (const role of customRoles.data) {
    TestValidator.equals("custom role flag is false", role.builtIn, false);
  }
  // 4. Filter by omitting builtIn parameter
  const allRoles = await api.functional.hrmPlatform.member.roles.index(
    memberConnection,
    {
      body: {
        limit: 100,
      } satisfies IHrmPlatformRole.IRequest,
    },
  );
  typia.assert(allRoles);
  TestValidator.equals(
    "total roles match sum of built-in and custom",
    allRoles.pagination.records,
    builtInRoles.pagination.records + customRoles.pagination.records,
  );
}
