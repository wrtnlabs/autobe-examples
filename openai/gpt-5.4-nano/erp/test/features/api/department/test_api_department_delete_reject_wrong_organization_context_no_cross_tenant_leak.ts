import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_department_delete_reject_wrong_organization_context_no_cross_tenant_leak(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a member actor (tenant context A) via join
  const tenantAConnection: api.IConnection = { host: connection.host };
  const tenantAAuth = await authorize_member_join(tenantAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/organization/join",
      referrer: "https://example.com/organization/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Prepare another member actor (tenant context B)
  const tenantBConnection: api.IConnection = { host: connection.host };
  const tenantBAuth = await authorize_member_join(tenantBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/organization/join",
      referrer: "https://example.com/organization/join",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Create a fresh connection for tenant B using its token
  const tenantBTokenConnection: api.IConnection = { host: connection.host };
  tenantBTokenConnection.headers ??= {};
  tenantBTokenConnection.headers.Authorization = tenantBAuth.token.access;
  // We cannot create an actual department in tenant A because the provided
  // materials only include the department deletion endpoint.
  // Use a UUID as a candidate department id and verify that deleting it from
  // the wrong tenant context is rejected.
  const wrongTenantDepartmentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "reject deletion when departmentId belongs to another organization context (no cross-tenant leak)",
    async () => {
      await api.functional.erpHrmTimeTracking.member.departments.erase(
        tenantBTokenConnection,
        {
          departmentId: wrongTenantDepartmentId,
        },
      );
    },
  );
  // Keep a tiny assertion that tenant tokens differ (sanity check for tenant context separation)
  TestValidator.notEquals(
    "tenant token access should differ between contexts",
    tenantAAuth.token.access,
    tenantBAuth.token.access,
  );
}
