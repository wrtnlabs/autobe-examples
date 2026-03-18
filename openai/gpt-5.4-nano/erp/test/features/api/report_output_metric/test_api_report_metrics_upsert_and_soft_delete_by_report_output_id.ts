import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import type { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import type { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import type { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import type { IErpHrmTimeTrackingReportOutputMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutputMetric";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_report_metrics_upsert_and_soft_delete_by_report_output_id(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberA);

  const reportOutputForOrgBIdRef: { id: string } = { id: "" };

  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      organizationName: RandomGenerator.name(),
      organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
      organizationLogoUrl: null,
      organizationCurrencyCode: "USD",
      organizationTimezone: "Asia/Seoul",
      organizationFiscalStartMonth: 1,
      href: "https://example.com/",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeTrackingMember.IJoin,
  });
  typia.assert(memberB);

  const generateBodyA: IErpHrmTimeTrackingReportDefinition =
    typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationRunA =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberAConnection,
      {
        body: generateBodyA,
      },
    );
  typia.assert(generationRunA);

  TestValidator.predicate(
    "generation run should include at least one output",
    () => generationRunA.outputs.length > 0,
  );

  const reportOutputIdA: string & tags.Format<"uuid"> =
    generationRunA.outputs[0].id;

  const metricNameExisting = `metric_existing_${RandomGenerator.alphabets(6)}`;
  const metricNameNew = `metric_new_${RandomGenerator.alphabets(6)}`;

  const upsertInitialRequest = typia.assert<
    IErpHrmTimeTrackingReportOutputMetric.IRequest
  >({
    items: [
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: metricNameExisting as never,
        remove: false as never,
      }),
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: metricNameNew as never,
        remove: false as never,
      }),
    ],
  });

  const upsertInitial =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberAConnection,
      {
        reportOutputId: reportOutputIdA,
        body: upsertInitialRequest,
      },
    );
  typia.assert(upsertInitial);

  const upsertUpdateExistingRequest = typia.assert<
    IErpHrmTimeTrackingReportOutputMetric.IRequest
  >({
    items: [
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: metricNameExisting as never,
        remove: false as never,
      }),
    ],
  });

  const upsertUpdateExisting =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberAConnection,
      {
        reportOutputId: reportOutputIdA,
        body: upsertUpdateExistingRequest,
      },
    );
  typia.assert(upsertUpdateExisting);

  const deleteMetricExistingRequest = typia.assert<
    IErpHrmTimeTrackingReportOutputMetric.IRequest
  >({
    items: [
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: metricNameExisting as never,
        remove: true as never,
      }),
    ],
  });

  const deleteMetricExisting =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberAConnection,
      {
        reportOutputId: reportOutputIdA,
        body: deleteMetricExistingRequest,
      },
    );
  typia.assert(deleteMetricExisting);

  TestValidator.predicate(
    "deleted_at should be non-null after remove=true",
    () =>
      deleteMetricExisting.deleted_at !== null &&
      deleteMetricExisting.deleted_at !== undefined,
  );

  const deleteAgainRequest = typia.assert<
    IErpHrmTimeTrackingReportOutputMetric.IRequest
  >({
    items: [
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: metricNameExisting as never,
        remove: true as never,
      }),
    ],
  });

  const deleteAgain =
    await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
      memberAConnection,
      {
        reportOutputId: reportOutputIdA,
        body: deleteAgainRequest,
      },
    );
  typia.assert(deleteAgain);

  TestValidator.equals(
    "deleted_at remains non-null on idempotent delete",
    deleteAgain.deleted_at !== null,
    true,
  );

  const generateBodyB: IErpHrmTimeTrackingReportDefinition =
    typia.random<IErpHrmTimeTrackingReportDefinition>();
  const generationRunB =
    await api.functional.erpHrmTimeTracking.member.reportDefinitions.generate.generateReport(
      memberBConnection,
      {
        body: generateBodyB,
      },
    );
  typia.assert(generationRunB);

  TestValidator.predicate(
    "generation run for orgB should include output",
    () => generationRunB.outputs.length > 0,
  );

  reportOutputForOrgBIdRef.id = generationRunB.outputs[0].id;

  const crossOrgRequest = typia.assert<
    IErpHrmTimeTrackingReportOutputMetric.IRequest
  >({
    items: [
      typia.assert<
        (IErpHrmTimeTrackingReportOutputMetric.IRequestItem & unknown)
      >({
        metric_name: `metric_cross_${RandomGenerator.alphabets(6)}` as never,
        remove: false as never,
      }),
    ],
  });

  await TestValidator.httpError(
    "should reject updateMetrics for reportOutputId from different organization",
    [400, 401, 403, 404],
    async () => {
      await api.functional.erpHrmTimeTracking.reportOutputs.metrics.updateMetrics(
        memberAConnection,
        {
          reportOutputId: reportOutputForOrgBIdRef.id,
          body: crossOrgRequest,
        },
      );
    },
  );
}
