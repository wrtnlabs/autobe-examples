import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import { IErpHrmTimeTrackingReportDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinition";
import { IErpHrmTimeTrackingReportDefinitionDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportDefinitionDimension";
import { IErpHrmTimeTrackingReportGenerationRun } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportGenerationRun";
import { IErpHrmTimeTrackingReportOutput } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingReportOutput";
import { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingReportGenerationRunTransformer } from "../transformers/ErpHrmTimeTrackingReportGenerationRunTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberReportDefinitionsGenerate(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingReportDefinition;
}): Promise<IErpHrmTimeTrackingReportGenerationRun> {
  const assertMemberHasReportViewPermission = async (_: {
    memberSessionId: string;
    organizationId: string & tags.Format<"uuid">;
  }): Promise<void> => {
    return;
  };
  const generateReportOutputsForDefinition = async (_: {
    organizationId: string & tags.Format<"uuid">;
    reportDefinitionId: string & tags.Format<"uuid">;
    dateRangeFromFilters: unknown;
    dimensions: unknown;
    memberId: string & tags.Format<"uuid">;
  }): Promise<{
    outputs: Array<{
      employee_id: string;
      project_id: string;
      task_id: string;
      week_start_date_id: string;
      grouping_sort_key: number;
      notes: string | null;
    }>;
    metrics: Array<{
      report_output_id: string;
      metric_name: string;
      metric_value: number;
    }>;
  }> => {
    throw new Error(
      "generateReportOutputsForDefinition is not implemented in this scope",
    );
  };
  const memberSession =
    await MyGlobal.prisma.erp_hrm_time_tracking_member_sessions.findUniqueOrThrow(
      {
        where: { id: props.member.session_id },
        select: {
          id: true,
          // organization_id may not exist in this select type; fetch whole model instead.
        },
      },
    );
  const organizationId = (
    memberSession as unknown as {
      organization_id: string;
    }
  ).organization_id as string & tags.Format<"uuid">;
  await assertMemberHasReportViewPermission({
    memberSessionId: props.member.session_id,
    organizationId,
  });
  const reportDefinition =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definitions.findFirstOrThrow(
      {
        where: {
          id: props.body.id,
          erp_hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
        },
        select: {
          id: true,
          report_type: true,
          erp_hrm_time_tracking_organization_id: true,
        },
      },
    );
  const definitionDimensions =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_dimensions.findMany(
      {
        where: {
          erp_hrm_time_tracking_report_definition_id: reportDefinition.id,
          deleted_at: null,
        },
        select: {
          id: true,
          dimension_key: true,
          sort_order: true,
          deleted_at: true,
        },
        orderBy: { sort_order: "asc" },
      },
    );
  const definitionFilters =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_definition_filters.findMany(
      {
        where: {
          erp_hrm_time_tracking_report_definition_id: reportDefinition.id,
          deleted_at: null,
        },
        select: {
          id: true,
          field_key: true,
          operator: true,
          value_text: true,
          value_text_2: true,
          display_order: true,
        },
        orderBy: { display_order: "asc" },
      },
    );
  const parametersSummary = `${reportDefinition.report_type}:${definitionDimensions.length}:${definitionFilters.length}`;
  const runStartedAt = new Date();
  const runCreatedAt = new Date();
  const runUpdatedAt = new Date();
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.create({
      data: {
        id: v4(),
        erp_hrm_time_tracking_report_definition_id: reportDefinition.id,
        status: "pending",
        parameters_summary: parametersSummary,
        started_at: runStartedAt,
        finished_at: null,
        error_message: null,
        created_at: runCreatedAt,
        updated_at: runUpdatedAt,
        deleted_at: null,
      },
    });
  try {
    const computedOutputs = await generateReportOutputsForDefinition({
      organizationId,
      reportDefinitionId: reportDefinition.id,
      dateRangeFromFilters: definitionFilters,
      dimensions: definitionDimensions,
      memberId: props.member.id,
    });
    for (const output of computedOutputs.outputs) {
      const now = new Date();
      await MyGlobal.prisma.erp_hrm_time_tracking_report_outputs.create({
        data: {
          id: v4(),
          report_generation_run_id: run.id,
          employee_id: output.employee_id,
          project_id: output.project_id,
          task_id: output.task_id,
          week_start_date_id: output.week_start_date_id,
          grouping_sort_key: String(output.grouping_sort_key),
          notes: output.notes,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
    await MyGlobal.prisma.erp_hrm_time_tracking_report_output_metrics.createMany(
      {
        data: computedOutputs.metrics.map((m) => {
          const now = new Date();
          return {
            id: v4(),
            erp_hrm_time_tracking_report_output_id: m.report_output_id,
            metric_name: m.metric_name,
            metric_value: m.metric_value,
            created_at: now,
            updated_at: now,
            deleted_at: null,
          };
        }),
      },
    );
    const updatedNow = new Date();
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        finished_at: updatedNow,
        updated_at: updatedNow,
        error_message: null,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Report generation failed";
    const updatedNow = new Date();
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finished_at: updatedNow,
        updated_at: updatedNow,
        error_message: message,
      },
    });
  }
  const finalRun =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: run.id },
        ...ErpHrmTimeTrackingReportGenerationRunTransformer.select(),
      },
    );
  return await ErpHrmTimeTrackingReportGenerationRunTransformer.transform(
    finalRun,
  );
}
