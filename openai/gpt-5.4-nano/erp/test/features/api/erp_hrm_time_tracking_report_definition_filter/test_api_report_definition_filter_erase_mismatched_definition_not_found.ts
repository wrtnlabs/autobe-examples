import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportDefinitionFilter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionFilter";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_time_tracking_report_definitions_create } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_create";
import { generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter } from "../../../generate/generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter";
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_filter_erase_mismatched_definition_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "P@ssw0rd!";
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      organizationName: `${RandomGenerator.alphabets(8)} Inc`,
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 3,
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/ref" as string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers ??= {};
  actorConnection.headers.Authorization = memberConnection.headers
    ?.Authorization as string;
  const reportDefinitionA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      actorConnection,
      {},
    );
  typia.assert(reportDefinitionA);
  const reportDefinitionB =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      actorConnection,
      {},
    );
  typia.assert(reportDefinitionB);
  await generate_random_erp_hrm_time_tracking_report_definitions_filters_create_report_definition_filter(
    actorConnection,
    {
      params: { reportDefinitionId: reportDefinitionA.id },
    },
  );
  await TestValidator.error(
    "erase filter should fail when filter does not belong to report definition",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.erase(
        actorConnection,
        {
          reportDefinitionId: reportDefinitionB.id,
          filterId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
