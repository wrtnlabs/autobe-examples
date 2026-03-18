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

export async function test_api_dashboard_without_report_view_personal_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join & auth (actor-specific connection)
  const memberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: 1,
    href: RandomGenerator.paragraph({ sentences: 1 }).replace(/\s+/g, ""),
    referrer: RandomGenerator.paragraph({ sentences: 1 }).replace(/\s+/g, ""),
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  // Fix URI fields to satisfy tags.Format<"uri">
  joinBody.href =
    `https://test.local/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">;
  joinBody.referrer =
    `https://test.local/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">;
  await authorize_member_join(memberConnection, { body: joinBody });
  // 2) Call dashboard
  const output =
    await api.functional.erpHrmTimeTracking.member.dashboard.at(
      memberConnection,
    );
  typia.assert(output);
  // 3) Best-effort validation: ensure response is well-formed.
  // Widget-level assertions require response DTO shape that is not available
  // in the provided materials.
  TestValidator.predicate(
    "dashboard response is associated with an organization",
    output.organization_id.length > 0,
  );
}
