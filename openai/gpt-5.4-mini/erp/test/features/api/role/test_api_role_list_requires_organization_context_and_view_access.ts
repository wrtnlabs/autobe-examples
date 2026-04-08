import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_list_requires_organization_context_and_view_access(
  connection: api.IConnection,
): Promise<void> {
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "roles list requires authentication or organization context",
    [401, 403],
    async () => {
      await api.functional.erpHrmTime.member.roles.index(guestConnection, {
        body: {},
      });
    },
  );
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Seoul!2345" as string & tags.Format<"password">,
      displayName: RandomGenerator.name(),
      href: "https://example.com/onboarding",
      referrer: "https://example.com/landing",
      avatarImageUrl: null,
      phoneNumber: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  try {
    const roles = await api.functional.erpHrmTime.member.roles.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IErpHrmTimeRole.IRequest,
      },
    );
    typia.assert(roles);
    TestValidator.predicate(
      "role list should contain built-in owner role",
      ArrayUtil.has(
        roles.data,
        (role) => role.name === "Owner" && role.isBuiltin,
      ),
    );
    TestValidator.predicate(
      "role list should contain built-in manager role",
      ArrayUtil.has(
        roles.data,
        (role) => role.name === "Manager" && role.isBuiltin,
      ),
    );
    TestValidator.predicate(
      "role list should contain built-in employee role",
      ArrayUtil.has(
        roles.data,
        (role) => role.name === "Employee" && role.isBuiltin,
      ),
    );
    TestValidator.predicate(
      "role list should be paginated",
      roles.pagination.current === 1 && roles.pagination.limit === 100,
    );
  } catch (error) {
    if (typeof error !== "object" || error === null || !("status" in error))
      throw error;
    const status = (error as { status: number }).status;
    TestValidator.predicate(
      "member without organization context should be rejected",
      status === 401 || status === 403,
    );
  }
}
