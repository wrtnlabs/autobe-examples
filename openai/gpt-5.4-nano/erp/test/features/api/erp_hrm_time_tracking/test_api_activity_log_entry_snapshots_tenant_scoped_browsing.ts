import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingActivityLogEntrySnapshot";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingActivityLogEntrySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingActivityLogEntrySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entry_snapshots_tenant_scoped_browsing(
  connection: api.IConnection,
): Promise<void> {
  const fromDate = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  const toDate = new Date();
  const memberJoin = async (props: {
    email: string & tags.Format<"email">;
    organizationName: string;
  }) => {
    const memberConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(memberConnection, {
      body: {
        email: props.email,
        password: "Password#1234!",
        organizationName: props.organizationName,
        organizationDescription: `Tenant ${props.organizationName}`,
        organizationCurrencyCode: "KRW",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 3,
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
        ip: null,
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
    typia.assert(authorized);
    return memberConnection;
  };
  // Tenant A
  const tenantAEmail = typia.random<string & tags.Format<"email">>();
  const tenantAOrg = `tenant-a-${RandomGenerator.alphaNumeric(8)}`;
  const tenantAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(tenantAConnection, {
    body: {
      email: tenantAEmail,
      password: "Password#1234!",
      organizationName: tenantAOrg,
      organizationDescription: `Tenant ${tenantAOrg}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // Tenant B
  const tenantBEmail = typia.random<string & tags.Format<"email">>();
  const tenantBOrg = `tenant-b-${RandomGenerator.alphaNumeric(8)}`;
  const tenantBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(tenantBConnection, {
    body: {
      email: tenantBEmail,
      password: "Password#1234!",
      organizationName: tenantBOrg,
      organizationDescription: `Tenant ${tenantBOrg}`,
      organizationCurrencyCode: "KRW",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 4,
      href: "https://example.com/join",
      referrer: "https://example.com/ref",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const requestBody = {
    from: fromDate.toISOString(),
    to: toDate.toISOString(),
    page: 1,
    limit: 10,
    sort: "created_at",
    sortOrder: "desc",
  } satisfies IErpHrmTimeTrackingActivityLogEntrySnapshot.IRequest;
  // Call browsing for tenant A
  const pageA =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index(
      tenantAConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageA);
  TestValidator.predicate(
    "tenant A pagination current is non-negative",
    pageA.pagination.current >= 0,
  );
  TestValidator.predicate(
    "tenant A pagination limit is non-negative",
    pageA.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "tenant A pagination records is non-negative",
    pageA.pagination.records >= 0,
  );
  TestValidator.predicate(
    "tenant A pagination pages is non-negative",
    pageA.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "tenant A data array exists",
    Array.isArray(pageA.data),
  );
  // Call browsing for tenant B
  const pageB =
    await api.functional.erpHrmTimeTracking.member.activityLogEntrySnapshots.index(
      tenantBConnection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageB);
  TestValidator.predicate(
    "tenant B pagination current is non-negative",
    pageB.pagination.current >= 0,
  );
  TestValidator.predicate(
    "tenant B pagination limit is non-negative",
    pageB.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "tenant B pagination records is non-negative",
    pageB.pagination.records >= 0,
  );
  TestValidator.predicate(
    "tenant B pagination pages is non-negative",
    pageB.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "tenant B data array exists",
    Array.isArray(pageB.data),
  );
  // Cross-tenant leakage check: IDs should differ for distinct tenants.
  const idsA = pageA.data.map((s) => s.id);
  const idsB = pageB.data.map((s) => s.id);
  const sameLength = idsA.length === idsB.length;
  const sameIds = sameLength && idsA.every((id, i) => id === idsB[i]);
  if (idsA.length === 0 && idsB.length === 0) {
    // Both empty: cannot prove ordering; at least ensure pagination indicates no records.
    TestValidator.equals("tenant A records is 0", pageA.pagination.records, 0);
    TestValidator.equals("tenant B records is 0", pageB.pagination.records, 0);
  } else {
    TestValidator.notEquals(
      "tenant-scoped results should not be identical across tenants",
      idsA,
      idsB,
    );
    TestValidator.predicate(
      "if both non-empty, IDs should not be in identical order",
      !(sameLength && sameIds),
    );
  }
}
