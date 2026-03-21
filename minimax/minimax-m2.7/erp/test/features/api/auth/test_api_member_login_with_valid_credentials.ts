import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import type { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_with_valid_credentials(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new member account via join endpoint
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  const joined = await api.functional.erpHrm.auth.member.join(joinConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IErpHrmMember.IJoin,
  });
  typia.assert(joined);
  // 2. Login using the registered email and correct password
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await api.functional.erpHrm.auth.member.login(
    loginConnection,
    {
      body: {
        email,
        password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IErpHrmMember.ILogin,
    },
  );
  typia.assert(authorized);
  // 3. Validate business logic - email matches registered email
  TestValidator.equals(
    "member email matches registered email",
    authorized.email,
    email,
  );
  // 4. Validate response structure via typia.assert covers complete type validation
  TestValidator.predicate(
    "has access token",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "has refresh token",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "has activeTimers array",
    Array.isArray(authorized.activeTimers),
  );
  TestValidator.predicate("has projectSummary", !!authorized.projectSummary);
  TestValidator.predicate("has taskOverview", !!authorized.taskOverview);
  TestValidator.predicate("has recentActivity", !!authorized.recentActivity);
}
