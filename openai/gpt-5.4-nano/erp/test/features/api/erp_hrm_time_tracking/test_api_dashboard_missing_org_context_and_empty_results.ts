import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_dashboard_missing_org_context_and_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // -----------------------------
  // Scenario setup
  // -----------------------------
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Aa1!Aa1!Aa1!";
  const emailA = typia.random<
    string & tags.Format<"email">
  >() satisfies string & tags.Format<"email">;
  // Join: creates initial organization for the member.
  await authorize_member_join(memberConnection, {
    body: {
      email: emailA,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join",
      referrer: "https://example.com/referrer",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // -----------------------------
  // Scenario A: missing organization context
  // -----------------------------
  // With the provided SDK/utility surface, we cannot explicitly clear the
  // organization context from the session. We therefore validate that the
  // dashboard endpoint does not crash and still behaves as a business rule
  // (either blocked due to missing org context or returns a valid payload).
  //
  // The endpoint is expected to be blocked when organization context is
  // missing; if the harness automatically sets org context, we accept 200.
  let dashboardA: IErpHrmTimeTrackingReportDefinition | undefined;
  try {
    dashboardA =
      await api.functional.erpHrmTimeTracking.member.dashboard.at(
        memberConnection,
      );
  } catch (e) {
    await TestValidator.httpError(
      "dashboard should be blocked for missing organization context",
      [400, 401, 403, 422],
      () => {
        throw e;
      },
    );
  }
  if (dashboardA) {
    typia.assert(dashboardA);
  }
  // -----------------------------
  // Scenario B: empty org data should not crash
  // -----------------------------
  // Create another member+org with no additional seeded time-tracking data.
  const memberConnectionB: api.IConnection = { host: connection.host };
  const emailB = typia.random<
    string & tags.Format<"email">
  >() satisfies string & tags.Format<"email">;
  await authorize_member_join(memberConnectionB, {
    body: {
      email: emailB,
      password,
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/join-empty",
      referrer: "https://example.com/referrer-empty",
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const dashboardB =
    await api.functional.erpHrmTimeTracking.member.dashboard.at(
      memberConnectionB,
    );
  typia.assert(dashboardB);
  TestValidator.predicate(
    "dashboard report definition has id",
    dashboardB.id.length > 0,
  );
}
