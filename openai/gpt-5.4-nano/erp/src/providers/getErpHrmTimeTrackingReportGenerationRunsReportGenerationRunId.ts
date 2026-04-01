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
import { ErpHrmTimeTrackingReportGenerationRunTransformer } from "../transformers/ErpHrmTimeTrackingReportGenerationRunTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeTrackingReportGenerationRunsReportGenerationRunId(props: {
  reportGenerationRunId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTrackingReportGenerationRun> {
  const run =
    await MyGlobal.prisma.erp_hrm_time_tracking_report_generation_runs.findUniqueOrThrow(
      {
        where: { id: props.reportGenerationRunId },
        select: {
          id: true,
          status: true,
          parameters_summary: true,
          started_at: true,
          finished_at: true,
          error_message: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          reportDefinition: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              report_type: true,
              is_active: true,
              erp_hrm_time_tracking_organization_id: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_url: true,
                  currency_code: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
              creatorMember: {
                select: {
                  id: true,
                  email: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                },
              },
            },
          },
          reportOutputs: {
            where: { deleted_at: null },
            orderBy: { created_at: "asc" },
            select: {
              id: true,
              report_generation_run_id: true,
              employee_id: true,
              project_id: true,
              task_id: true,
              week_start_date_id: true,
              grouping_sort_key: true,
              notes: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              outputMetrics: {
                where: { deleted_at: null },
                select: { id: true },
              },
              employee: {
                select: {
                  id: true,
                  email: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  timelogs: { select: { id: true } },
                  contracts: { select: { id: true } },
                  contractSnapshots: { select: { id: true } },
                  timesheets: { select: { id: true } },
                  timerSessions: { select: { id: true } },
                  password_hash: true,
                  sessions: { select: { id: true } },
                  passwordResets: { select: { id: true } },
                  emailVerifications: { select: { id: true } },
                  projectMemberships: { select: { id: true } },
                  assignedTasks: { select: { id: true } },
                  performedActivityLogEntries: { select: { id: true } },
                  createdReportDefinitions: { select: { id: true } },
                  reportOutputs: { select: { id: true } },
                },
              },
              project: {
                select: {
                  id: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  name: true,
                  color: true,
                  erp_hrm_time_tracking_organization_id: true,
                  timelogs: { select: { id: true } },
                  timerSessions: { select: { id: true } },
                  projectMemberships: { select: { id: true } },
                  reportOutputs: { select: { id: true } },
                  tasks: { select: { id: true } },
                  organization: {
                    select: { id: true },
                  },
                },
              },
              task: {
                select: {
                  id: true,
                  status: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  erp_hrm_time_tracking_project_id: true,
                  description: true,
                  parent_task_id: true,
                  assigned_employee_id: true,
                  title: true,
                  priority: true,
                  estimated_hours: true,
                  due_date: true,
                  project: {
                    select: {
                      id: true,
                      status: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                      organization: {
                        select: { id: true },
                      },
                      timelogs: { select: { id: true } },
                      name: true,
                      timerSessions: { select: { id: true } },
                      projectMemberships: { select: { id: true } },
                      reportOutputs: { select: { id: true } },
                      color: true,
                      tasks: { select: { id: true } },
                    },
                  },
                  assignedEmployee: {
                    select: {
                      id: true,
                      email: true,
                      created_at: true,
                      updated_at: true,
                      deleted_at: true,
                      timelogs: { select: { id: true } },
                      contracts: { select: { id: true } },
                      contractSnapshots: { select: { id: true } },
                      timesheets: { select: { id: true } },
                      timerSessions: { select: { id: true } },
                      password_hash: true,
                      sessions: { select: { id: true } },
                      passwordResets: { select: { id: true } },
                      emailVerifications: { select: { id: true } },
                      projectMemberships: { select: { id: true } },
                      assignedTasks: { select: { id: true } },
                      performedActivityLogEntries: { select: { id: true } },
                      createdReportDefinitions: { select: { id: true } },
                      reportOutputs: { select: { id: true } },
                    },
                  },
                  reportOutputs: { select: { id: true } },
                },
              },
              weekStartDate: {
                select: {
                  id: true,
                  dimension_key: true,
                  dimension_label: true,
                  sort_order: true,
                  created_at: true,
                  updated_at: true,
                  deleted_at: true,
                  reportOutputs: { select: { id: true } },
                  reportDefinition: {
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    );
  type TransformerInput = Parameters<
    typeof ErpHrmTimeTrackingReportGenerationRunTransformer.transform
  >[0];
  return await ErpHrmTimeTrackingReportGenerationRunTransformer.transform(
    run as unknown as TransformerInput,
  );
}
