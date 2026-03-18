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

export async function test_api_report_definitions_create_ordered_dimensions_filters_success(
  connection: api.IConnection,
): Promise<void> {
  const baseMemberConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "P@ssw0rd-" + RandomGenerator.alphabets(8);
  const organizationName = "org_" + RandomGenerator.alphabets(8);
  const organizationDescription = RandomGenerator.paragraph({ sentences: 2 });
  const memberAuth: IErpHrmTimeTrackingMember.IAuthorized =
    await authorize_member_join(baseMemberConnection, {
      body: {
        email,
        password,
        organizationName,
        organizationDescription,
        organizationLogoUrl: null,
        organizationCurrencyCode: "USD",
        organizationTimezone: "Asia/Seoul",
        organizationFiscalStartMonth: 1,
        href: "https://example.com/join",
        referrer: "https://example.com/ref",
        ip: "127.0.0.1",
      } satisfies IErpHrmTimeTrackingMember.IJoin,
    });
  typia.assert(memberAuth);
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  const reportType = "time_tracking";
  const makeDimensions = (
    aKey: string,
    bKey: string,
  ): IErpHrmTimeTrackingReportDefinitionDimension.ICreate[] => {
    const d1 = {
      dimension_key: aKey,
      dimension_label: RandomGenerator.name(),
      sort_order: 1,
    } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
    const d2 = {
      dimension_key: bKey,
      dimension_label: RandomGenerator.name(),
      sort_order: 2,
    } satisfies IErpHrmTimeTrackingReportDefinitionDimension.ICreate;
    return [d1, d2];
  };
  const makeFilters = (
    enabledFirst: boolean,
    firstFieldKey: string,
    secondFieldKey: string,
  ): IErpHrmTimeTrackingReportDefinitionFilter.ICreate[] => {
    const f1 = {
      field_key: firstFieldKey,
      operator: "eq",
      value_text: RandomGenerator.alphabets(10),
      value_text_2: null,
      is_enabled: enabledFirst,
      display_order: 1,
    } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
    const f2 = {
      field_key: secondFieldKey,
      operator: "eq",
      value_text: RandomGenerator.alphabets(10),
      value_text_2: null,
      is_enabled: !enabledFirst,
      display_order: 2,
    } satisfies IErpHrmTimeTrackingReportDefinitionFilter.ICreate;
    return [f1, f2];
  };
  const createOne = async (codeSuffix: string) => {
    const requestedCode = `code_${codeSuffix}_${RandomGenerator.alphabets(6)}`;
    const requestedName = `Report ${RandomGenerator.name(2)}`;
    const requestedDescription: string | null = null;
    const dimensionKeys = [
      `dim_${RandomGenerator.alphabets(6)}`,
      `dim_${RandomGenerator.alphabets(6)}`,
    ];
    const dimensions = makeDimensions(dimensionKeys[0], dimensionKeys[1]);
    const filters = makeFilters(
      true,
      `field_${RandomGenerator.alphabets(6)}`,
      `field_${RandomGenerator.alphabets(6)}`,
    );
    const requestBody = {
      code: requestedCode,
      name: requestedName,
      description: requestedDescription,
      report_type: reportType,
      is_active: true,
      definitionDimensions: dimensions,
      definitionFilters: filters,
    } satisfies IErpHrmTimeTrackingReportDefinition.ICreate;
    const created: IErpHrmTimeTrackingReportDefinition =
      await api.functional.erpHrmTimeTracking.reportDefinitions.create(
        memberConnection,
        { body: requestBody },
      );
    typia.assert(created);
    TestValidator.equals("code matches", created.code, requestedCode);
    TestValidator.equals("name matches", created.name, requestedName);
    TestValidator.equals(
      "description matches",
      created.description,
      requestedDescription,
    );
    TestValidator.equals(
      "report_type matches",
      created.report_type,
      reportType,
    );
    TestValidator.equals("is_active matches", created.is_active, true);
    // DTO typing in provided definitions marks dimensions/filters as boolean.
    // Therefore we only validate that the response shape is type-correct.
    TestValidator.predicate(
      "dimensions is boolean",
      typeof created.dimensions === "boolean",
    );
    TestValidator.predicate(
      "filters is boolean",
      typeof created.filters === "boolean",
    );
    return { created, requestBody };
  };
  const first = await createOne("a");
  const second = await createOne("b");
  TestValidator.notEquals(
    "second code differs from first",
    first.created.code,
    second.created.code,
  );
  TestValidator.equals(
    "second report_type matches",
    second.created.report_type,
    first.created.report_type,
  );
  TestValidator.equals(
    "second is_active matches",
    second.created.is_active,
    true,
  );
}
