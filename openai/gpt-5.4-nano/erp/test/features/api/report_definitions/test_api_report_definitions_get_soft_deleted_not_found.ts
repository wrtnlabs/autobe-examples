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

export async function test_api_report_definitions_get_soft_deleted_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Password123!";
  const email = typia.random<string & tags.Format<"email">>();
  const organizationName = RandomGenerator.name();
  const organizationDescription = RandomGenerator.paragraph({ sentences: 2 });
  const organizationCurrencyCode = "USD";
  const organizationTimezone = "Asia/Seoul";
  const organizationFiscalStartMonth = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
  >();
  const href = "https://example.com/join";
  const referrer = "https://example.com/ref";
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email,
      password,
      organizationName,
      organizationDescription,
      organizationCurrencyCode,
      organizationTimezone,
      organizationFiscalStartMonth,
      href,
      referrer,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(authorized);
  const reportDefinitionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "soft-deleted report definition must be inaccessible",
    async () => {
      const output =
        await api.functional.erpHrmTimeTracking.reportDefinitions.at(
          memberConnection,
          { reportDefinitionId },
        );
      typia.assert(output);
      // If the endpoint returns a DTO, it violates the requirement that
      // soft-deleted definitions behave as inaccessible.
      throw new Error(
        "Expected not found/access denied, but got report definition DTO",
      );
    },
  );
}
