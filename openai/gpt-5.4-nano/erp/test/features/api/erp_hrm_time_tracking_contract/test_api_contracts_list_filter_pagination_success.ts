import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_contracts_list_filter_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a new member (join) to get member session/tenant context
  const memberConnectionBase: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnectionBase, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      organizationName: RandomGenerator.name(2),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Build a deterministic, scoped filtered + paginated request
  const requestedLimit = 10 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1 = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const now = new Date();
  const startFrom = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24 * 30,
  ).toISOString() as string & tags.Format<"date-time">;
  const endTo = RandomGenerator.date(
    now,
    1000 * 60 * 60 * 24 * 60,
  ).toISOString() as string & tags.Format<"date-time">;
  const contractNumberNeedle = RandomGenerator.alphabets(8);
  const statusNeedle = "active";
  const sortBy = "created_at";
  const sortDirection = "desc" as const;
  const reqBody1 = {
    contractNumber: contractNumberNeedle,
    status: statusNeedle,
    workTermStartDateFrom: startFrom,
    workTermEndDateTo: endTo,
    sortBy,
    sortDirection,
    page: page1,
    limit: requestedLimit,
  } satisfies IErpHrmTimeTrackingContract.IRequest;
  const page1Resp =
    await api.functional.erpHrmTimeTracking.member.contracts.index(
      memberConnection,
      { body: reqBody1 },
    );
  typia.assert(page1Resp);
  // 3) Validate response shape + pagination coherence
  TestValidator.equals("pagination.current", page1Resp.pagination.current, 1);
  TestValidator.equals(
    "pagination.limit",
    page1Resp.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    page1Resp.pagination.records >= page1Resp.data.length,
  );
  const expectedPages =
    page1Resp.pagination.records === 0
      ? 0
      : Math.ceil(page1Resp.pagination.records / page1Resp.pagination.limit);
  TestValidator.equals(
    "pagination.pages matches ceil(records/limit)",
    page1Resp.pagination.pages,
    expectedPages,
  );
  for (const item of page1Resp.data) {
    typia.assert(item);
    typia.assert(item.employee);
    TestValidator.equals(
      "employee.id exists",
      item.employee.id.length > 0,
      true,
    );
    TestValidator.equals(
      "employee.email exists",
      item.employee.email.length > 0,
      true,
    );
  }
  // 4) If non-empty, validate page=2 with same filters + sort
  if (page1Resp.data.length > 0) {
    const page2 = 2 as number & tags.Type<"int32"> & tags.Minimum<1>;
    const reqBody2 = {
      ...reqBody1,
      page: page2,
    } satisfies IErpHrmTimeTrackingContract.IRequest;
    const page2Resp =
      await api.functional.erpHrmTimeTracking.member.contracts.index(
        memberConnection,
        { body: reqBody2 },
      );
    typia.assert(page2Resp);
    TestValidator.equals(
      "pagination.current (page2)",
      page2Resp.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination.limit (page2)",
      page2Resp.pagination.limit,
      requestedLimit,
    );
    TestValidator.predicate(
      "pagination.records >= data length (page2)",
      page2Resp.pagination.records >= page2Resp.data.length,
    );
    if (page2Resp.data.length > 0) {
      TestValidator.notEquals(
        "page1 and page2 should not start with same first contract id",
        page1Resp.data[0].id,
        page2Resp.data[0].id,
      );
      if (sortBy === "created_at") {
        const first1 = page1Resp.data[0].created_at;
        const first2 = page2Resp.data[0].created_at;
        if (sortDirection === "desc") {
          TestValidator.predicate(
            "desc ordering: first2 <= first1",
            first2 <= first1,
          );
        } else {
          TestValidator.predicate(
            "asc ordering: first2 >= first1",
            first2 >= first1,
          );
        }
      }
    }
  }
}
