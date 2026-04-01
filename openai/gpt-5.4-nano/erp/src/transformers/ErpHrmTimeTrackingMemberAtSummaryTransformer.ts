import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_tracking_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_member_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_member_password_resetsFindManyArgs,
        emailVerifications: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_member_email_verificationsFindManyArgs,
        contracts: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_contractsFindManyArgs,
        contractSnapshots: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_contract_snapshotsFindManyArgs,
        projectMemberships: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_project_membershipsFindManyArgs,
        assignedTasks: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_tasksFindManyArgs,
        timelogs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timelogsFindManyArgs,
        timesheets: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timesheetsFindManyArgs,
        timerSessions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_timer_sessionsFindManyArgs,
        performedActivityLogEntries: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_activity_log_entriesFindManyArgs,
        createdReportDefinitions: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_report_definitionsFindManyArgs,
        reportOutputs: {
          select: { id: true },
        } satisfies Prisma.erp_hrm_time_tracking_report_outputsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_time_tracking_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
