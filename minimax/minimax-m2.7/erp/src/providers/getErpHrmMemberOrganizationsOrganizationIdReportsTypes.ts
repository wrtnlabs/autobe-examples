import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
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

export async function getErpHrmMemberOrganizationsOrganizationIdReportsTypes(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IErpHrmReport[]> {
  // Verify organization exists for data isolation
  const organization =
    await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: {
        id: true,
        name: true,
        description: true,
        logo_uri: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        owner: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_uri: true,
            phone: true,
            created_at: true,
          },
        },
      },
    });
  // Verify member has report:view permission via their employee role
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    include: {
      role: {
        include: {
          rolePermissions: {
            select: { permission: true },
          },
        },
      },
    },
  });
  const hasReportViewPermission = employee.role.rolePermissions.some(
    (rp) => rp.permission === "report:view",
  );
  if (!hasReportViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Hardcoded report type metadata
  const reportTypes = [
    {
      report_type: "time_report",
      description:
        "Hours logged per employee for any date range, with breakdowns by employee, project, or task, and filtering by billable status",
    },
    {
      report_type: "project_budget_report",
      description:
        "Budget consumption across projects showing estimated vs actual hours",
    },
    {
      report_type: "weekly_summary_report",
      description: "Week-by-week statistics showing productivity trends",
    },
  ];
  const now = new Date().toISOString() as string & tags.Format<"date-time">;
  const nowInt = 1 as number & tags.Type<"int32">;
  // Get member data for generatedByMember
  const member = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone: true,
      created_at: true,
    },
  });
  // Build response with report type metadata
  // Each entry includes report_type identifier and description stored in 'name' field
  return reportTypes.map((rt) => ({
    id: v4() as string & tags.Format<"uuid">,
    report_type: rt.report_type,
    name: rt.description,
    created_at: now,
    updated_at: now,
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? undefined,
      logoUri: organization.logo_uri ?? undefined,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscalStartMonth: organization.fiscal_start_month as number &
        tags.Type<"int32">,
      createdAt: organization.created_at.toISOString() as string &
        tags.Format<"date-time">,
      owner: {
        id: organization.owner.id,
        email: organization.owner.email,
        displayName: organization.owner.display_name,
        avatarUri: organization.owner.avatar_uri ?? undefined,
        phone: organization.owner.phone ?? undefined,
        createdAt: organization.owner.created_at.toISOString() as string &
          tags.Format<"date-time">,
      },
    } satisfies IErpHrmOrganization.ISummary,
    generatedByMember: {
      id: member.id,
      email: member.email,
      displayName: member.display_name,
      avatarUri: member.avatar_uri ?? undefined,
      phone: member.phone ?? undefined,
      createdAt: member.created_at.toISOString() as string &
        tags.Format<"date-time">,
    } satisfies IErpHrmMember.ISummary,
    parameter: {
      id: v4() as string & tags.Format<"uuid">,
      billable: undefined,
      group_by: "employee" as "employee" | "project" | "task",
      start_date: now,
      end_date: now,
      created_at: now,
      updated_at: now,
      employee: undefined,
      project: undefined,
      task: undefined,
      report: {
        id: v4() as string & tags.Format<"uuid">,
        report_type: rt.report_type,
        name: rt.description,
        created_at: now,
        generatedByMember: {
          id: member.id,
          email: member.email,
          displayName: member.display_name,
          avatarUri: member.avatar_uri ?? undefined,
          phone: member.phone ?? undefined,
          createdAt: member.created_at.toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IErpHrmMember.ISummary,
      } satisfies IErpHrmReport.ISummary,
    } satisfies IErpHrmReportParameter,
  }));
}
