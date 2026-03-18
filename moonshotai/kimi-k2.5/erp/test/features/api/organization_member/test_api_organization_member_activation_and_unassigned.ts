import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_organization_member_activation_and_unassigned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      avatarUrl: null,
      timezone: "Asia/Seoul",
      locale: "en-US",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IErpHrmMember.IJoin,
  });
  // 2. Query with is_active=false to retrieve deactivated members
  const deactivatedResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: {
          isActive: false,
          limit: 20,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(deactivatedResult);
  // Validate all returned members are deactivated (business rule: cannot perform new work)
  for (const member of deactivatedResult.data) {
    TestValidator.equals("deactivated member status", member.is_active, false);
  }
  // 3. Query with departmentIds containing 'unassigned' sentinel value
  const unassignedResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: {
          departmentIds: ["unassigned"],
          limit: 20,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(unassignedResult);
  // Validate all returned members have null department
  for (const member of unassignedResult.data) {
    TestValidator.equals(
      "unassigned member department",
      member.department,
      null,
    );
  }
  // 4. Query combining is_active filter with department filters
  const combinedResult =
    await api.functional.erpHrm.member.organizationMembers.index(
      memberConnection,
      {
        body: {
          isActive: true,
          departmentIds: ["unassigned"],
          limit: 20,
        } satisfies IErpHrmOrganizationMember.IRequest,
      },
    );
  typia.assert(combinedResult);
  // Validate intersection: active AND unassigned
  for (const member of combinedResult.data) {
    TestValidator.equals(
      "combined query member is active",
      member.is_active,
      true,
    );
    TestValidator.equals(
      "combined query member is unassigned",
      member.department,
      null,
    );
  }
}
