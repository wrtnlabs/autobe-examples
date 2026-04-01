import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
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

export async function patchErpHrmTimeMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimesheet.IRequest;
}): Promise<IPageIErpHrmTimeTimesheet.ISummary> {
  const organizationMembership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (organizationMembership === null) {
    throw new HttpException("Organization context is missing", 403);
  }
  const employee = await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
    where: {
      erp_hrm_time_member_id: props.member.id,
      erp_hrm_time_organization_id:
        organizationMembership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.erp_hrm_time_timesheetsWhereInput = {
    deleted_at: null,
    employee: {
      erp_hrm_time_organization_id:
        organizationMembership.erp_hrm_time_organization_id,
      deleted_at: null,
      ...(employee === null ? {} : { id: employee.id }),
    },
    ...(props.body.status === null ? {} : { status: props.body.status }),
    ...(props.body.weekStartDateFrom === null &&
    props.body.weekStartDateTo === null
      ? {}
      : {
          week_start_date: {
            ...(props.body.weekStartDateFrom === null
              ? {}
              : { gte: new globalThis.Date(props.body.weekStartDateFrom) }),
            ...(props.body.weekStartDateTo === null
              ? {}
              : { lte: new globalThis.Date(props.body.weekStartDateTo) }),
          },
        }),
    ...(props.body.weekEndDateFrom === null && props.body.weekEndDateTo === null
      ? {}
      : {
          week_end_date: {
            ...(props.body.weekEndDateFrom === null
              ? {}
              : { gte: new globalThis.Date(props.body.weekEndDateFrom) }),
            ...(props.body.weekEndDateTo === null
              ? {}
              : { lte: new globalThis.Date(props.body.weekEndDateTo) }),
          },
        }),
    ...(props.body.submittedAtFrom === null && props.body.submittedAtTo === null
      ? {}
      : {
          submitted_at: {
            ...(props.body.submittedAtFrom === null
              ? {}
              : { gte: new globalThis.Date(props.body.submittedAtFrom) }),
            ...(props.body.submittedAtTo === null
              ? {}
              : { lte: new globalThis.Date(props.body.submittedAtTo) }),
          },
        }),
    ...(props.body.reviewedAtFrom === null && props.body.reviewedAtTo === null
      ? {}
      : {
          reviewed_at: {
            ...(props.body.reviewedAtFrom === null
              ? {}
              : { gte: new globalThis.Date(props.body.reviewedAtFrom) }),
            ...(props.body.reviewedAtTo === null
              ? {}
              : { lte: new globalThis.Date(props.body.reviewedAtTo) }),
          },
        }),
  };
  const orderBy: Prisma.erp_hrm_time_timesheetsOrderByWithRelationInput =
    props.body.sort === "weekStartDateAsc"
      ? { week_start_date: "asc" }
      : props.body.sort === "weekStartDateDesc"
        ? { week_start_date: "desc" }
        : props.body.sort === "weekEndDateAsc"
          ? { week_end_date: "asc" }
          : props.body.sort === "weekEndDateDesc"
            ? { week_end_date: "desc" }
            : props.body.sort === "submittedAtAsc"
              ? { submitted_at: "asc" }
              : props.body.sort === "submittedAtDesc"
                ? { submitted_at: "desc" }
                : props.body.sort === "reviewedAtAsc"
                  ? { reviewed_at: "asc" }
                  : props.body.sort === "reviewedAtDesc"
                    ? { reviewed_at: "desc" }
                    : { created_at: "desc" };
  const data = await MyGlobal.prisma.erp_hrm_time_timesheets.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      employee: {
        select: {
          id: true,
          position_title: true,
          employment_type: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          organization: { select: { id: true } },
          member: { select: { id: true } },
          role: { select: { id: true } },
          department: { select: { id: true } },
        },
      },
      week_start_date: true,
      week_end_date: true,
      status: true,
      submitted_at: true,
      reviewed_at: true,
      rejection_reason: true,
      reviewedByMember: { select: { id: true } },
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_time_timesheets.count({ where });
  return {
    data: data.map((record) => ({
      id: record.id,
      employee: {
        id: record.employee.id,
        organization: { id: record.employee.organization.id },
        member: { id: record.employee.member.id },
        role: {
          id: record.employee.role.id,
          organization: { id: record.employee.organization.id },
          name: "",
          description: null,
          isBuiltin: false,
          createdAt: toISOStringSafe(record.employee.created_at),
          updatedAt: toISOStringSafe(record.employee.updated_at),
          deletedAt:
            record.employee.deleted_at === null
              ? null
              : toISOStringSafe(record.employee.deleted_at),
        } satisfies IErpHrmTimeRole.ISummary,
        department:
          record.employee.department === null
            ? null
            : ({
                id: record.employee.department.id,
                organization: { id: record.employee.organization.id },
                name: "",
                description: null,
                parentDepartment: null,
                createdAt: toISOStringSafe(record.employee.created_at),
                updatedAt: toISOStringSafe(record.employee.updated_at),
                deletedAt:
                  record.employee.deleted_at === null
                    ? null
                    : toISOStringSafe(record.employee.deleted_at),
              } satisfies IErpHrmTimeDepartment.ISummary),
        positionTitle: record.employee.position_title,
        employmentType: record.employee.employment_type,
        status: record.employee.status,
        createdAt: toISOStringSafe(record.employee.created_at),
        updatedAt: toISOStringSafe(record.employee.updated_at),
        deletedAt:
          record.employee.deleted_at === null
            ? null
            : toISOStringSafe(record.employee.deleted_at),
      } satisfies IErpHrmTimeEmployee.ISummary,
      weekStartDate: toISOStringSafe(record.week_start_date),
      weekEndDate: toISOStringSafe(record.week_end_date),
      status: record.status,
      submittedAt:
        record.submitted_at === null
          ? null
          : toISOStringSafe(record.submitted_at),
      reviewedAt:
        record.reviewed_at === null
          ? null
          : toISOStringSafe(record.reviewed_at),
      rejectionReason: record.rejection_reason,
      reviewedByMember:
        record.reviewedByMember === null
          ? null
          : ({
              id: record.reviewedByMember.id,
              name: "",
              email: "",
              createdAt: toISOStringSafe(record.created_at),
              updatedAt: toISOStringSafe(record.updated_at),
              deletedAt:
                record.deleted_at === null
                  ? null
                  : toISOStringSafe(record.deleted_at),
            } satisfies IErpHrmTimeMember.ISummary),
      createdAt: toISOStringSafe(record.created_at),
      updatedAt: toISOStringSafe(record.updated_at),
      deletedAt:
        record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
