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

export async function test_api_report_dimensions_duplicate_dimension_key_in_batch(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/welcome" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  // 2) Create a report definition with at least one dimension
  const reportDefinition =
    await generate_random_erp_hrm_time_tracking_report_definitions_create(
      memberConnection,
      {
        body: {
          code: `rd_${RandomGenerator.alphaNumeric(10)}`,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          is_active: true,
          definitionDimensions: [
            {
              dimension_key:
                typia.random<
                  IErpHrmTimeTrackingReportDefinitionDimension.ICreate["dimension_key"]
                >(),
              dimension_label:
                typia.random<
                  IErpHrmTimeTrackingReportDefinitionDimension.ICreate["dimension_label"]
                >(),
              sort_order:
                typia.random<
                  IErpHrmTimeTrackingReportDefinitionDimension.ICreate["sort_order"]
                >(),
            },
          ],
          definitionFilters: [],
        },
      },
    );
  typia.assert(reportDefinition);
  // 3) Attempt PATCH with duplicate dimension_key within same request batch
  const dupKey =
    typia.random<
      IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension["dimension_key"]
    >();
  const bodyWithDuplicates = {
    dimensions: [
      {
        dimension_key: dupKey,
        dimension_label:
          typia.random<
            IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension["dimension_label"]
          >(),
        sort_order:
          typia.random<
            IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension["sort_order"]
          >(),
      },
      {
        dimension_key: dupKey,
        dimension_label:
          typia.random<
            IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension["dimension_label"]
          >(),
        sort_order:
          typia.random<
            IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension["sort_order"]
          >(),
      },
    ],
    page: null,
    limit: null,
  } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IRequest;
  await TestValidator.error(
    "reject duplicate dimension_key entries in same batch",
    async () => {
      await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
        memberConnection,
        {
          reportDefinitionId: reportDefinition.id,
          body: bodyWithDuplicates,
        },
      );
    },
  );
  // 5) PATCH again with corrected non-duplicate dimensions list
  const first =
    typia.random<
      IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension
    >();
  let second =
    typia.random<
      IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension
    >();
  if (second.dimension_key === first.dimension_key) {
    second =
      typia.random<
        IErpHrmTimeTrackingReportDefinitionDimension.IRequestDimension
      >();
  }
  const correctedBody = {
    dimensions: [first, second],
    page: null,
    limit: null,
  } satisfies IErpHrmTimeTrackingReportDefinitionDimension.IRequest;
  const updated =
    await api.functional.erpHrmTimeTracking.reportDefinitions.dimensions.updateDimensions(
      memberConnection,
      {
        reportDefinitionId: reportDefinition.id,
        body: correctedBody,
      },
    );
  typia.assert(updated);

  const updatedDimensionCount = (() => {
    if (
      typeof updated === "object" &&
      updated !== null &&
      "length" in updated &&
      typeof (updated as { length: number }).length === "number"
    ) {
      return (updated as { length: number }).length;
    }
    if (
      typeof updated === "object" &&
      updated !== null &&
      "count" in updated &&
      typeof (updated as { count: number }).count === "number"
    ) {
      return (updated as { count: number }).count;
    }
    if (
      typeof updated === "object" &&
      updated !== null &&
      "total" in updated &&
      typeof (updated as { total: number }).total === "number"
    ) {
      return (updated as { total: number }).total;
    }
    if (
      typeof updated === "object" &&
      updated !== null &&
      "dimensions" in updated &&
      Array.isArray((updated as { dimensions: unknown }).dimensions)
    ) {
      return (updated as { dimensions: unknown[] }).dimensions.length;
    }
    throw new Error("Unsupported updateDimensions response shape");
  })();

  TestValidator.equals("updated dimension count", updatedDimensionCount, 2);
}
