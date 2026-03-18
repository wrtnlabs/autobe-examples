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
import { prepare_random_erp_hrm_time_tracking_report_definition } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition";
import { prepare_random_erp_hrm_time_tracking_report_definition_dimension } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_dimension";
import { prepare_random_erp_hrm_time_tracking_report_definition_filter } from "../../../prepare/prepare_random_erp_hrm_time_tracking_report_definition_filter";

export async function test_api_report_definition_filter_read_scoped_success_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const password = "Password123!";
  const joinBody = {
    email: memberEmail,
    password,
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: randint(1, 12),
    href: "https://example.com/join",
    referrer: "https://example.com/ref",
    ip: null,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, {
    body: joinBody,
  });

  const createdA =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {},
    );
  typia.assert(createdA);

  const createdB =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {},
    );
  typia.assert(createdB);

  const emptyFilters = [] as ReadonlyArray<IErpHrmTimeTrackingReportDefinitionFilter>;

  const runtimeFiltersA: ReadonlyArray<IErpHrmTimeTrackingReportDefinitionFilter> =
    typia.assert<ReadonlyArray<IErpHrmTimeTrackingReportDefinitionFilter>>(
      (createdA as unknown as { filters?: unknown }).filters ?? emptyFilters,
    );

  const runtimeFiltersB: ReadonlyArray<IErpHrmTimeTrackingReportDefinitionFilter> =
    typia.assert<ReadonlyArray<IErpHrmTimeTrackingReportDefinitionFilter>>(
      (createdB as unknown as { filters?: unknown }).filters ?? emptyFilters,
    );

  TestValidator.predicate(
    "definition A has at least one filter",
    () => runtimeFiltersA.length > 0,
  );
  TestValidator.predicate(
    "definition B has at least one filter",
    () => runtimeFiltersB.length > 0,
  );

  const enabledFilterA = runtimeFiltersA.find((f) => f.isEnabled);
  const enabledFilterB = runtimeFiltersB.find((f) => f.isEnabled);

  TestValidator.predicate(
    "definition A has at least one enabled filter",
    () => enabledFilterA !== undefined,
  );

  const expectedA = enabledFilterA ?? runtimeFiltersA[0];

  const read1 =
    await api.functional.erpHrmTimeTracking.reportDefinitions.filters.at(
      memberConnection,
      {
        reportDefinitionId: createdA.id,
        filterId: expectedA.id,
      },
    );
  typia.assert(read1);

  TestValidator.equals(
    "reportDefinitionId matches",
    read1.reportDefinitionId,
    createdA.id,
  );
  TestValidator.equals("id matches", read1.id, expectedA.id);
  TestValidator.equals("fieldKey matches", read1.fieldKey, expectedA.fieldKey);
  TestValidator.equals("operator matches", read1.operator, expectedA.operator);
  TestValidator.equals(
    "valueText matches",
    read1.valueText,
    expectedA.valueText,
  );
  TestValidator.equals(
    "valueText2 matches",
    read1.valueText2,
    expectedA.valueText2,
  );
  TestValidator.equals(
    "isEnabled matches",
    read1.isEnabled,
    expectedA.isEnabled,
  );
  TestValidator.equals(
    "displayOrder matches",
    read1.displayOrder,
    expectedA.displayOrder,
  );
  TestValidator.predicate(
    "createdAt is ISO-8601 date-time",
    () => !Number.isNaN(Date.parse(read1.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO-8601 date-time",
    () => !Number.isNaN(Date.parse(read1.updatedAt)),
  );
  TestValidator.equals("deletedAt is null", read1.deletedAt, null);

  const expectedB = enabledFilterB ?? runtimeFiltersB[0];

  await TestValidator.httpError(
    "404 for mismatched reportDefinitionId/filterId",
    404,
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.at(
        memberConnection,
        {
          reportDefinitionId: createdA.id,
          filterId: expectedB.id,
        },
      );
    },
  );

  const missingReportDefinitionId = typia.random<
    string & tags.Format<"uuid">
  >();

  const anyFilterId = expectedA.id;

  await TestValidator.httpError(
    "404 for non-existent reportDefinitionId",
    404,
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.filters.at(
        memberConnection,
        {
          reportDefinitionId: missingReportDefinitionId,
          filterId: anyFilterId,
        },
      );
    },
  );
}
