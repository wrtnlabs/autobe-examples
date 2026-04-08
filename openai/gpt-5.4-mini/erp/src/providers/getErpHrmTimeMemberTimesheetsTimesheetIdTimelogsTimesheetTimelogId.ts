import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
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

export async function getErpHrmTimeMemberTimesheetsTimesheetIdTimelogsTimesheetTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timesheetTimelogId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeTimesheetTimelog> {
  const record =
    await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findUniqueOrThrow({
      where: {
        id: props.timesheetTimelogId,
      },
      select: {
        id: true,
        erp_hrm_time_timesheet_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        timesheet: {
          select: {
            id: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            employee: {
              select: {
                id: true,
                organization: {
                  select: {
                    id: true,
                    owner_member_id: true,
                    name: true,
                    description: true,
                    logo_image_url: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                member: {
                  select: {
                    id: true,
                  },
                },
                role: {
                  select: {
                    id: true,
                    organization: {
                      select: {
                        id: true,
                        owner_member_id: true,
                        name: true,
                        description: true,
                        logo_image_url: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    name: true,
                    description: true,
                    is_builtin: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                department: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    organization: {
                      select: {
                        id: true,
                        owner_member_id: true,
                        name: true,
                        description: true,
                        logo_image_url: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    parentDepartment: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        organization: {
                          select: {
                            id: true,
                            owner_member_id: true,
                            name: true,
                            description: true,
                            logo_image_url: true,
                            status: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                          },
                        },
                        parentDepartment: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                position_title: true,
                employment_type: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            reviewedByMember: {
              select: {
                id: true,
              },
            },
            week_start_date: true,
            week_end_date: true,
            status: true,
            submitted_at: true,
            reviewed_at: true,
            rejection_reason: true,
          },
        },
        timelog: {
          select: {
            id: true,
            member: {
              select: {
                id: true,
              },
            },
            project: {
              select: {
                id: true,
                organization: {
                  select: {
                    id: true,
                    owner_member_id: true,
                    name: true,
                    description: true,
                    logo_image_url: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                name: true,
                description: true,
                color_code: true,
                status: true,
                budget_hours: true,
                start_date: true,
                end_date: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            task: {
              select: {
                id: true,
                project: {
                  select: {
                    id: true,
                    organization: {
                      select: {
                        id: true,
                        owner_member_id: true,
                        name: true,
                        description: true,
                        logo_image_url: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    name: true,
                    description: true,
                    color_code: true,
                    status: true,
                    budget_hours: true,
                    start_date: true,
                    end_date: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                employee: {
                  select: {
                    id: true,
                    organization: {
                      select: {
                        id: true,
                        owner_member_id: true,
                        name: true,
                        description: true,
                        logo_image_url: true,
                        status: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    member: {
                      select: {
                        id: true,
                      },
                    },
                    role: {
                      select: {
                        id: true,
                        organization: {
                          select: {
                            id: true,
                            owner_member_id: true,
                            name: true,
                            description: true,
                            logo_image_url: true,
                            status: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                          },
                        },
                        name: true,
                        description: true,
                        is_builtin: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    department: {
                      select: {
                        id: true,
                        name: true,
                        description: true,
                        organization: {
                          select: {
                            id: true,
                            owner_member_id: true,
                            name: true,
                            description: true,
                            logo_image_url: true,
                            status: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                          },
                        },
                        parentDepartment: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    position_title: true,
                    employment_type: true,
                    status: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                parentTask: {
                  select: {
                    id: true,
                    project: {
                      select: {
                        id: true,
                        organization: {
                          select: {
                            id: true,
                            owner_member_id: true,
                            name: true,
                            description: true,
                            logo_image_url: true,
                            status: true,
                            created_at: true,
                            updated_at: true,
                            deleted_at: true,
                          },
                        },
                        name: true,
                        description: true,
                        color_code: true,
                        status: true,
                        budget_hours: true,
                        start_date: true,
                        end_date: true,
                        created_at: true,
                        updated_at: true,
                        deleted_at: true,
                      },
                    },
                    employee: true,
                    parentTask: true,
                    title: true,
                    description: true,
                    status: true,
                    priority: true,
                    estimated_hours: true,
                    due_date: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                title: true,
                description: true,
                status: true,
                priority: true,
                estimated_hours: true,
                due_date: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            work_date: true,
            duration_minutes: true,
            description: true,
            billable: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (
    record.erp_hrm_time_timesheet_id !== props.timesheetId ||
    record.deleted_at !== null
  ) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: record.id,
    timesheet: {
      id: record.timesheet.id,
      employee: {
        id: record.timesheet.employee.id,
        organization: {
          id: record.timesheet.employee.organization.id,
          ownerMember: {
            id: record.timesheet.employee.organization.owner_member_id,
          } satisfies IErpHrmTimeMember.ISummary,
          name: record.timesheet.employee.organization.name,
          description: record.timesheet.employee.organization.description,
          logoImageUrl: record.timesheet.employee.organization.logo_image_url,
          status: record.timesheet.employee.organization.status,
          createdAt: toISOStringSafe(
            record.timesheet.employee.organization.created_at,
          ),
          updatedAt: toISOStringSafe(
            record.timesheet.employee.organization.updated_at,
          ),
          deletedAt:
            record.timesheet.employee.organization.deleted_at === null
              ? null
              : toISOStringSafe(
                  record.timesheet.employee.organization.deleted_at,
                ),
        } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
        member: record.timesheet.employee.member,
        role: {
          id: record.timesheet.employee.role.id,
          organization: {
            id: record.timesheet.employee.role.organization.id,
            ownerMember: {
              id: record.timesheet.employee.role.organization.owner_member_id,
            } satisfies IErpHrmTimeMember.ISummary,
            name: record.timesheet.employee.role.organization.name,
            description:
              record.timesheet.employee.role.organization.description,
            logoImageUrl:
              record.timesheet.employee.role.organization.logo_image_url,
            status: record.timesheet.employee.role.organization.status,
            createdAt: toISOStringSafe(
              record.timesheet.employee.role.organization.created_at,
            ),
            updatedAt: toISOStringSafe(
              record.timesheet.employee.role.organization.updated_at,
            ),
            deletedAt:
              record.timesheet.employee.role.organization.deleted_at === null
                ? null
                : toISOStringSafe(
                    record.timesheet.employee.role.organization.deleted_at,
                  ),
          } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
          name: record.timesheet.employee.role.name,
          description: record.timesheet.employee.role.description,
          isBuiltin: record.timesheet.employee.role.is_builtin,
          createdAt: toISOStringSafe(record.timesheet.employee.role.created_at),
          updatedAt: toISOStringSafe(record.timesheet.employee.role.updated_at),
          deletedAt:
            record.timesheet.employee.role.deleted_at === null
              ? null
              : toISOStringSafe(record.timesheet.employee.role.deleted_at),
        } satisfies IErpHrmTimeRole.ISummary,
        department:
          record.timesheet.employee.department === null
            ? null
            : ({
                id: record.timesheet.employee.department.id,
                name: record.timesheet.employee.department.name,
                description: record.timesheet.employee.department.description,
                organization: {
                  id: record.timesheet.employee.department.organization.id,
                  ownerMember: {
                    id: record.timesheet.employee.department.organization
                      .owner_member_id,
                  } satisfies IErpHrmTimeMember.ISummary,
                  name: record.timesheet.employee.department.organization.name,
                  description:
                    record.timesheet.employee.department.organization
                      .description,
                  logoImageUrl:
                    record.timesheet.employee.department.organization
                      .logo_image_url,
                  status:
                    record.timesheet.employee.department.organization.status,
                  createdAt: toISOStringSafe(
                    record.timesheet.employee.department.organization
                      .created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    record.timesheet.employee.department.organization
                      .updated_at,
                  ),
                  deletedAt:
                    record.timesheet.employee.department.organization
                      .deleted_at === null
                      ? null
                      : toISOStringSafe(
                          record.timesheet.employee.department.organization
                            .deleted_at,
                        ),
                } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                parentDepartment: null,
                created_at: toISOStringSafe(
                  record.timesheet.employee.department.created_at,
                ),
                updated_at: toISOStringSafe(
                  record.timesheet.employee.department.updated_at,
                ),
                deleted_at:
                  record.timesheet.employee.department.deleted_at === null
                    ? null
                    : toISOStringSafe(
                        record.timesheet.employee.department.deleted_at,
                      ),
              } satisfies IErpHrmTimeDepartment.ISummary),
        positionTitle: record.timesheet.employee.position_title,
        employmentType: record.timesheet.employee.employment_type,
        status: record.timesheet.employee.status,
        createdAt: toISOStringSafe(record.timesheet.employee.created_at),
        updatedAt: toISOStringSafe(record.timesheet.employee.updated_at),
        deletedAt:
          record.timesheet.employee.deleted_at === null
            ? null
            : toISOStringSafe(record.timesheet.employee.deleted_at),
      } satisfies IErpHrmTimeEmployeeDashboardSummary.ISummary,
      reviewedByMember: record.timesheet.reviewedByMember,
      weekStartDate: toISOStringSafe(record.timesheet.week_start_date),
      weekEndDate: toISOStringSafe(record.timesheet.week_end_date),
      status: record.timesheet.status,
      submittedAt:
        record.timesheet.submitted_at === null
          ? null
          : toISOStringSafe(record.timesheet.submitted_at),
      reviewedAt:
        record.timesheet.reviewed_at === null
          ? null
          : toISOStringSafe(record.timesheet.reviewed_at),
      rejectionReason: record.timesheet.rejection_reason,
      createdAt: toISOStringSafe(record.timesheet.created_at),
      updatedAt: toISOStringSafe(record.timesheet.updated_at),
      deletedAt:
        record.timesheet.deleted_at === null
          ? null
          : toISOStringSafe(record.timesheet.deleted_at),
    } satisfies IErpHrmTimeTimesheet.ISummary,
    timelog: {
      id: record.timelog.id,
      member: record.timelog.member,
      project: {
        id: record.timelog.project.id,
        organization: {
          id: record.timelog.project.organization.id,
          ownerMember: {
            id: record.timelog.project.organization.owner_member_id,
          } satisfies IErpHrmTimeMember.ISummary,
          name: record.timelog.project.organization.name,
          description: record.timelog.project.organization.description,
          logoImageUrl: record.timelog.project.organization.logo_image_url,
          status: record.timelog.project.organization.status,
          createdAt: toISOStringSafe(
            record.timelog.project.organization.created_at,
          ),
          updatedAt: toISOStringSafe(
            record.timelog.project.organization.updated_at,
          ),
          deletedAt:
            record.timelog.project.organization.deleted_at === null
              ? null
              : toISOStringSafe(record.timelog.project.organization.deleted_at),
        } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
        name: record.timelog.project.name,
        description: record.timelog.project.description,
        colorCode: record.timelog.project.color_code,
        status: record.timelog.project.status,
        budgetHours: record.timelog.project.budget_hours,
        startDate:
          record.timelog.project.start_date === null
            ? null
            : toISOStringSafe(record.timelog.project.start_date),
        endDate:
          record.timelog.project.end_date === null
            ? null
            : toISOStringSafe(record.timelog.project.end_date),
        createdAt: toISOStringSafe(record.timelog.project.created_at),
        updatedAt: toISOStringSafe(record.timelog.project.updated_at),
        deletedAt:
          record.timelog.project.deleted_at === null
            ? null
            : toISOStringSafe(record.timelog.project.deleted_at),
      } satisfies IErpHrmTimeProject.ISummary,
      task:
        record.timelog.task === null
          ? null
          : ({
              id: record.timelog.task.id,
              project: {
                id: record.timelog.task.project.id,
                organization: {
                  id: record.timelog.task.project.organization.id,
                  ownerMember: {
                    id: record.timelog.task.project.organization
                      .owner_member_id,
                  } satisfies IErpHrmTimeMember.ISummary,
                  name: record.timelog.task.project.organization.name,
                  description:
                    record.timelog.task.project.organization.description,
                  logoImageUrl:
                    record.timelog.task.project.organization.logo_image_url,
                  status: record.timelog.task.project.organization.status,
                  createdAt: toISOStringSafe(
                    record.timelog.task.project.organization.created_at,
                  ),
                  updatedAt: toISOStringSafe(
                    record.timelog.task.project.organization.updated_at,
                  ),
                  deletedAt:
                    record.timelog.task.project.organization.deleted_at === null
                      ? null
                      : toISOStringSafe(
                          record.timelog.task.project.organization.deleted_at,
                        ),
                } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                name: record.timelog.task.project.name,
                description: record.timelog.task.project.description,
                colorCode: record.timelog.task.project.color_code,
                status: record.timelog.task.project.status,
                budgetHours: record.timelog.task.project.budget_hours,
                startDate:
                  record.timelog.task.project.start_date === null
                    ? null
                    : toISOStringSafe(record.timelog.task.project.start_date),
                endDate:
                  record.timelog.task.project.end_date === null
                    ? null
                    : toISOStringSafe(record.timelog.task.project.end_date),
                createdAt: toISOStringSafe(
                  record.timelog.task.project.created_at,
                ),
                updatedAt: toISOStringSafe(
                  record.timelog.task.project.updated_at,
                ),
                deletedAt:
                  record.timelog.task.project.deleted_at === null
                    ? null
                    : toISOStringSafe(record.timelog.task.project.deleted_at),
              } satisfies IErpHrmTimeProject.ISummary,
              employee:
                record.timelog.task.employee === null
                  ? null
                  : ({
                      id: record.timelog.task.employee.id,
                      organization: {
                        id: record.timelog.task.employee.organization.id,
                        ownerMember: {
                          id: record.timelog.task.employee.organization
                            .owner_member_id,
                        } satisfies IErpHrmTimeMember.ISummary,
                        name: record.timelog.task.employee.organization.name,
                        description:
                          record.timelog.task.employee.organization.description,
                        logoImageUrl:
                          record.timelog.task.employee.organization
                            .logo_image_url,
                        status:
                          record.timelog.task.employee.organization.status,
                        createdAt: toISOStringSafe(
                          record.timelog.task.employee.organization.created_at,
                        ),
                        updatedAt: toISOStringSafe(
                          record.timelog.task.employee.organization.updated_at,
                        ),
                        deletedAt:
                          record.timelog.task.employee.organization
                            .deleted_at === null
                            ? null
                            : toISOStringSafe(
                                record.timelog.task.employee.organization
                                  .deleted_at,
                              ),
                      } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                      member: record.timelog.task.employee.member,
                      role: {
                        id: record.timelog.task.employee.role.id,
                        organization: {
                          id: record.timelog.task.employee.role.organization.id,
                          ownerMember: {
                            id: record.timelog.task.employee.role.organization
                              .owner_member_id,
                          } satisfies IErpHrmTimeMember.ISummary,
                          name: record.timelog.task.employee.role.organization
                            .name,
                          description:
                            record.timelog.task.employee.role.organization
                              .description,
                          logoImageUrl:
                            record.timelog.task.employee.role.organization
                              .logo_image_url,
                          status:
                            record.timelog.task.employee.role.organization
                              .status,
                          createdAt: toISOStringSafe(
                            record.timelog.task.employee.role.organization
                              .created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            record.timelog.task.employee.role.organization
                              .updated_at,
                          ),
                          deletedAt:
                            record.timelog.task.employee.role.organization
                              .deleted_at === null
                              ? null
                              : toISOStringSafe(
                                  record.timelog.task.employee.role.organization
                                    .deleted_at,
                                ),
                        } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                        name: record.timelog.task.employee.role.name,
                        description:
                          record.timelog.task.employee.role.description,
                        isBuiltin: record.timelog.task.employee.role.is_builtin,
                        createdAt: toISOStringSafe(
                          record.timelog.task.employee.role.created_at,
                        ),
                        updatedAt: toISOStringSafe(
                          record.timelog.task.employee.role.updated_at,
                        ),
                        deletedAt:
                          record.timelog.task.employee.role.deleted_at === null
                            ? null
                            : toISOStringSafe(
                                record.timelog.task.employee.role.deleted_at,
                              ),
                      } satisfies IErpHrmTimeRole.ISummary,
                      department:
                        record.timelog.task.employee.department === null
                          ? null
                          : ({
                              id: record.timelog.task.employee.department.id,
                              name: record.timelog.task.employee.department
                                .name,
                              description:
                                record.timelog.task.employee.department
                                  .description,
                              organization: {
                                id: record.timelog.task.employee.department
                                  .organization.id,
                                ownerMember: {
                                  id: record.timelog.task.employee.department
                                    .organization.owner_member_id,
                                } satisfies IErpHrmTimeMember.ISummary,
                                name: record.timelog.task.employee.department
                                  .organization.name,
                                description:
                                  record.timelog.task.employee.department
                                    .organization.description,
                                logoImageUrl:
                                  record.timelog.task.employee.department
                                    .organization.logo_image_url,
                                status:
                                  record.timelog.task.employee.department
                                    .organization.status,
                                createdAt: toISOStringSafe(
                                  record.timelog.task.employee.department
                                    .organization.created_at,
                                ),
                                updatedAt: toISOStringSafe(
                                  record.timelog.task.employee.department
                                    .organization.updated_at,
                                ),
                                deletedAt:
                                  record.timelog.task.employee.department
                                    .organization.deleted_at === null
                                    ? null
                                    : toISOStringSafe(
                                        record.timelog.task.employee.department
                                          .organization.deleted_at,
                                      ),
                              } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                              parentDepartment: null,
                              created_at: toISOStringSafe(
                                record.timelog.task.employee.department
                                  .created_at,
                              ),
                              updated_at: toISOStringSafe(
                                record.timelog.task.employee.department
                                  .updated_at,
                              ),
                              deleted_at:
                                record.timelog.task.employee.department
                                  .deleted_at === null
                                  ? null
                                  : toISOStringSafe(
                                      record.timelog.task.employee.department
                                        .deleted_at,
                                    ),
                            } satisfies IErpHrmTimeDepartment.ISummary),
                      positionTitle:
                        record.timelog.task.employee.position_title,
                      employmentType:
                        record.timelog.task.employee.employment_type,
                      status: record.timelog.task.employee.status,
                      createdAt: toISOStringSafe(
                        record.timelog.task.employee.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        record.timelog.task.employee.updated_at,
                      ),
                      deletedAt:
                        record.timelog.task.employee.deleted_at === null
                          ? null
                          : toISOStringSafe(
                              record.timelog.task.employee.deleted_at,
                            ),
                    } satisfies IErpHrmTimeEmployeeDashboardSummary.ISummary),
              parentTask:
                record.timelog.task.parentTask === null
                  ? null
                  : ({
                      id: record.timelog.task.parentTask.id,
                      project: {
                        id: record.timelog.task.parentTask.project.id,
                        organization: {
                          id: record.timelog.task.parentTask.project
                            .organization.id,
                          ownerMember: {
                            id: record.timelog.task.parentTask.project
                              .organization.owner_member_id,
                          } satisfies IErpHrmTimeMember.ISummary,
                          name: record.timelog.task.parentTask.project
                            .organization.name,
                          description:
                            record.timelog.task.parentTask.project.organization
                              .description,
                          logoImageUrl:
                            record.timelog.task.parentTask.project.organization
                              .logo_image_url,
                          status:
                            record.timelog.task.parentTask.project.organization
                              .status,
                          createdAt: toISOStringSafe(
                            record.timelog.task.parentTask.project.organization
                              .created_at,
                          ),
                          updatedAt: toISOStringSafe(
                            record.timelog.task.parentTask.project.organization
                              .updated_at,
                          ),
                          deletedAt:
                            record.timelog.task.parentTask.project.organization
                              .deleted_at === null
                              ? null
                              : toISOStringSafe(
                                  record.timelog.task.parentTask.project
                                    .organization.deleted_at,
                                ),
                        } satisfies IErpHrmTimeOrganizationDashboardSummary.ISummary,
                        name: record.timelog.task.parentTask.project.name,
                        description:
                          record.timelog.task.parentTask.project.description,
                        colorCode:
                          record.timelog.task.parentTask.project.color_code,
                        status: record.timelog.task.parentTask.project.status,
                        budgetHours:
                          record.timelog.task.parentTask.project.budget_hours,
                        startDate:
                          record.timelog.task.parentTask.project.start_date ===
                          null
                            ? null
                            : toISOStringSafe(
                                record.timelog.task.parentTask.project
                                  .start_date,
                              ),
                        endDate:
                          record.timelog.task.parentTask.project.end_date ===
                          null
                            ? null
                            : toISOStringSafe(
                                record.timelog.task.parentTask.project.end_date,
                              ),
                        createdAt: toISOStringSafe(
                          record.timelog.task.parentTask.project.created_at,
                        ),
                        updatedAt: toISOStringSafe(
                          record.timelog.task.parentTask.project.updated_at,
                        ),
                        deletedAt:
                          record.timelog.task.parentTask.project.deleted_at ===
                          null
                            ? null
                            : toISOStringSafe(
                                record.timelog.task.parentTask.project
                                  .deleted_at,
                              ),
                      } satisfies IErpHrmTimeProject.ISummary,
                      employee: null,
                      parentTask: null,
                      title: record.timelog.task.parentTask.title,
                      description: record.timelog.task.parentTask.description,
                      status: record.timelog.task.parentTask.status,
                      priority: record.timelog.task.parentTask.priority,
                      estimatedHours:
                        record.timelog.task.parentTask.estimated_hours,
                      dueDate:
                        record.timelog.task.parentTask.due_date === null
                          ? null
                          : toISOStringSafe(
                              record.timelog.task.parentTask.due_date,
                            ),
                      createdAt: toISOStringSafe(
                        record.timelog.task.parentTask.created_at,
                      ),
                      updatedAt: toISOStringSafe(
                        record.timelog.task.parentTask.updated_at,
                      ),
                      deletedAt:
                        record.timelog.task.parentTask.deleted_at === null
                          ? null
                          : toISOStringSafe(
                              record.timelog.task.parentTask.deleted_at,
                            ),
                    } satisfies IErpHrmTimeTaskHistoryEntry.ISummary),
              title: record.timelog.task.title,
              description: record.timelog.task.description,
              status: record.timelog.task.status,
              priority: record.timelog.task.priority,
              estimatedHours: record.timelog.task.estimated_hours,
              dueDate:
                record.timelog.task.due_date === null
                  ? null
                  : toISOStringSafe(record.timelog.task.due_date),
              createdAt: toISOStringSafe(record.timelog.task.created_at),
              updatedAt: toISOStringSafe(record.timelog.task.updated_at),
              deletedAt:
                record.timelog.task.deleted_at === null
                  ? null
                  : toISOStringSafe(record.timelog.task.deleted_at),
            } satisfies IErpHrmTimeTaskHistoryEntry.ISummary),
      workDate: toISOStringSafe(record.timelog.work_date),
      durationMinutes: record.timelog.duration_minutes,
      description: record.timelog.description,
      billable: record.timelog.billable,
      createdAt: toISOStringSafe(record.timelog.created_at),
      updatedAt: toISOStringSafe(record.timelog.updated_at),
      deletedAt:
        record.timelog.deleted_at === null
          ? null
          : toISOStringSafe(record.timelog.deleted_at),
    } satisfies IErpHrmTimeTimelog.ISummary,
    createdAt: toISOStringSafe(record.created_at),
    updatedAt: toISOStringSafe(record.updated_at),
    deletedAt:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  } satisfies IErpHrmTimeTimesheetTimelog;
}
