import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberOrganizationsTimezoneRebuild(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingOrganization.IRequest;
}): Promise<void> {
  const { member, body } = props;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const organizationId = body.id;
  if (!organizationId) {
    throw new HttpException("Organization id is required", 400);
  }
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_organizations.findUniqueOrThrow(
      {
        where: { id: organizationId },
        select: {
          id: true,
          timezone: true,
          deleted_at: true,
        },
      },
    );
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization is not available", 400);
  }
  const timezone = organization.timezone;
  if (
    timezone === null ||
    timezone === undefined ||
    timezone.trim().length === 0
  ) {
    throw new HttpException("Organization timezone is missing or invalid", 400);
  }
  const existingMember =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findUnique({
      where: { id: member.id },
      select: { id: true, deleted_at: true },
    });
  if (existingMember === null || existingMember.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrgContract =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirst({
      where: {
        erp_hrm_time_tracking_organization_id: organizationId,
        erp_hrm_time_tracking_employee_id: member.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (hasOrgContract === null) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = toISOStringSafe(new Date());
    const activityId = typia.assert<string & tags.Format<"uuid">>(v4());
    await tx.erp_hrm_time_tracking_activity_log_entries.create({
      data: {
        id: activityId,
        organization_id: organizationId,
        performed_by_member_id: member.id,
        action_type: "timezone_rebuild",
        target_entity_type: "organization",
        target_entity_id: organizationId,
        summary:
          "Rebuilt organization timezone interpretation for time reporting",
        details: `page=${page},limit=${limit}`,
        occurred_at: now,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    const reportDefinitions =
      await tx.erp_hrm_time_tracking_report_definitions.findMany({
        where: {
          erp_hrm_time_tracking_organization_id: organizationId,
          deleted_at: null,
          is_active: true,
        },
        select: { id: true },
      });
    for (const definition of reportDefinitions) {
      const runId = typia.assert<string & tags.Format<"uuid">>(v4());
      const parametersSummary = typia.assert<string>(`timezone=${timezone}`);
      await tx.erp_hrm_time_tracking_report_generation_runs.create({
        data: {
          id: runId,
          erp_hrm_time_tracking_report_definition_id: definition.id,
          status: "pending",
          parameters_summary: parametersSummary,
          started_at: null,
          finished_at: null,
          error_message: null,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });
    }
  });
}
