import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelogSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_snapshots_browse_pagination_stable_order(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join to obtain organization-scoped auth
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "P@ssw0rd1234",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "KRW",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: "https://example.com/join",
    referrer: "https://example.com/app",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  const authorized = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(authorized);
  // 2) Page 1 browse
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1 = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const pageOne =
    await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
      memberConnection,
      {
        body: {
          page: page1,
          limit: limit,
        } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
      },
    );
  typia.assert(pageOne);
  const pageOneOrg =
    pageOne.data.length > 0 ? pageOne.data[0].organization_id : undefined;
  for (const item of pageOne.data) {
    typia.assert(item);
    if (pageOneOrg !== undefined) {
      TestValidator.equals(
        "organization scoped",
        item.organization_id,
        pageOneOrg,
      );
    }
    TestValidator.predicate(
      "duration_minutes integer",
      Number.isInteger(item.duration_minutes),
    );
  }
  // 3) If there are more records, validate page 2 and ordering stability
  if (pageOne.pagination.records > limit) {
    const page2 = 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
    const pageTwo =
      await api.functional.erpHrmTimeTracking.member.timelogSnapshots.index(
        memberConnection,
        {
          body: {
            page: page2,
            limit: limit,
          } satisfies IErpHrmTimeTrackingTimelogSnapshot.IRequest,
        },
      );
    typia.assert(pageTwo);
    TestValidator.equals(
      "pagination current page",
      pageTwo.pagination.current,
      2,
    );
    // No duplicate ids across pages
    const ids1 = new Set(pageOne.data.map((x) => x.id));
    const dup = pageTwo.data.filter((x) => ids1.has(x.id));
    TestValidator.predicate("no duplicate ids across pages", dup.length === 0);
    // Validate differing content when records exceed a single page
    if (pageOne.data.length > 0 && pageTwo.data.length > 0) {
      const hasNew = pageTwo.data.some((x) => !ids1.has(x.id));
      TestValidator.predicate(
        "page2 differs from page1 when records exceed limit",
        hasNew,
      );
    }
    // Stable ordering boundary check: created_at DESC then id tie-break
    const parse = (s: string): number => new Date(s).getTime();
    const first2 = pageTwo.data[0];
    const last1 = pageOne.data[pageOne.data.length - 1];
    if (first2 && last1) {
      const c2 = parse(first2.created_at);
      const c1 = parse(last1.created_at);
      TestValidator.predicate("created_at ordering boundary", c2 <= c1);
      if (c2 === c1) {
        // tie-breaker evidence: compare ids lexicographically
        TestValidator.predicate(
          "id tie-break ordering boundary",
          last1.id.localeCompare(first2.id) <= 0,
        );
      }
    }
  }
}
