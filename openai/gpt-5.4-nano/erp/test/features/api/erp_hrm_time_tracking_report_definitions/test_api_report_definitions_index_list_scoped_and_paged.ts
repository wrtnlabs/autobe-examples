import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_definitions_index_list_scoped_and_paged(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member and establish org context
  const memberConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password-1234!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: joinBody,
  });
  typia.assert(authorized);

  const scopedConnection: api.IConnection = {
    host: connection.host,
    headers: memberConnection.headers,
  };

  // 2) List with pagination
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const listReq = {
    page,
    limit,
  } satisfies IErpHrmTimeTrackingReportDefinition.IRequest;

  const first = await api.functional.erpHrmTimeTracking.reportDefinitions.index(
    scopedConnection,
    {
      body: listReq,
    },
  );
  typia.assert(first);

  TestValidator.predicate("has data array", () => Array.isArray(first.data));
  TestValidator.equals("pagination current", first.pagination.current, page);
  TestValidator.equals("pagination limit", first.pagination.limit, limit);

  // Organization scoping check without assuming nested summary IDs
  if (first.data.length > 0) {
    const firstOrg = first.data[0].organization;
    for (const item of first.data) {
      TestValidator.equals("item organization scoped", item.organization, firstOrg);
    }
  }

  // 4) Deterministic ordering check
  const second =
    await api.functional.erpHrmTimeTracking.reportDefinitions.index(
      scopedConnection,
      {
        body: listReq,
      },
    );
  typia.assert(second);

  TestValidator.equals(
    "deterministic ordering data",
    second.data,
    first.data,
  );

  // 5) Empty-result scenario (cannot be guaranteed because IRequest has only page/limit)
  // Validate pagination shape remains consistent.
  const empty = await api.functional.erpHrmTimeTracking.reportDefinitions.index(
    scopedConnection,
    {
      body: listReq,
    },
  );
  typia.assert(empty);

  TestValidator.predicate("empty scenario data array", () => Array.isArray(empty.data));
  TestValidator.predicate("empty pagination consistency", () => {
    if (empty.data.length === 0)
      return empty.pagination.records === 0 && empty.pagination.pages === 0;
    return empty.pagination.records >= 0 && empty.pagination.pages >= 0;
  });

  // 7) Soft-delete scenario (validate deleted_at field presence/type)
  const soft = await api.functional.erpHrmTimeTracking.reportDefinitions.index(
    scopedConnection,
    {
      body: {
        page,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<0>,
      } satisfies IErpHrmTimeTrackingReportDefinition.IRequest,
    },
  );
  typia.assert(soft);

  for (const item of soft.data) {
    TestValidator.predicate(
      "deleted_at is null or date-time",
      () => item.deleted_at === null || item.deleted_at.length > 0,
    );
  }
}
