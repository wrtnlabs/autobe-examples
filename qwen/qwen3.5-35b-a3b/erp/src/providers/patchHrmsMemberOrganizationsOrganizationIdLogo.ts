import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
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

export async function patchHrmsMemberOrganizationsOrganizationIdLogo(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganization.IUpdateLogo;
}): Promise<IHrmsOrganization> {
  // 1. Verify organization exists
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
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
      updated_at: true,
    },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  // 2. Verify member belongs to organization with Owner/Manager role
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        organization: {
          id: props.organizationId,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        hrms_organization_role_id: true,
      },
    });
  if (!organizationMember) {
    throw new HttpException("Member not found in this organization", 404);
  }
  // Fetch role to check permissions
  const role = await MyGlobal.prisma.hrms_organization_roles.findUnique({
    where: { id: organizationMember.hrms_organization_role_id },
    select: { name: true },
  });
  if (!role || (role.name !== "Owner" && role.name !== "Manager")) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate file format
  const allowedExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
  const filename = props.body.file.split("/").pop() || props.body.file;
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    throw new HttpException(
      "Invalid file format. Allowed: JPEG, PNG, GIF, WebP",
      400,
    );
  }
  // 4. Delete old logo if exists
  if (organization.logo_uri) {
    const oldFile = await MyGlobal.prisma.hrms_files.findFirst({
      where: {
        organization: {
          id: props.organizationId,
        },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (oldFile) {
      await MyGlobal.prisma.hrms_files.update({
        where: { id: oldFile.id },
        data: { deleted_at: new Date() },
      });
    }
  }
  // 5. Create new file record
  const newFileId = v4() as string & tags.Format<"uuid">;
  const newFileUri = `/uploads/organizations/${props.organizationId}/${newFileId}.${extension}`;
  await MyGlobal.prisma.hrms_files.create({
    data: {
      id: newFileId,
      organization: {
        connect: {
          id: props.organizationId,
        },
      },
      owner_type: "organization",
      filename: filename,
      storage_path: newFileUri,
      file_size: 5242880,
      mime_type: `image/${extension}`,
      file_category: "organization_logo",
      validation_status: "validated",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 6. Update organization
  await MyGlobal.prisma.hrms_organizations.update({
    where: { id: props.organizationId },
    data: {
      logo_uri: newFileUri,
      updated_at: new Date(),
    },
  });
  // 7. Compute dashboard metrics
  const [totalActiveEmployees, totalHoursThisWeek, pendingTimesheetsCount] =
    await Promise.all([
      MyGlobal.prisma.hrms_employees.count({
        where: {
          organizationMember: {
            organization: {
              id: props.organizationId,
            },
          },
          status: "active",
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.hrms_timelogs.aggregate({
        where: {
          employee: {
            organizationMember: {
              organization: {
                id: props.organizationId,
              },
            },
            status: "active",
          },
          deleted_at: null,
          date: {
            gte: new Date(
              new Date().setDate(new Date().getDate() - new Date().getDay()),
            ),
            lte: new Date(
              new Date().setDate(
                new Date().getDate() + (6 - new Date().getDay()),
              ),
            ),
          },
        },
        _sum: { duration_minutes: true },
      }),
      MyGlobal.prisma.hrms_timesheets.count({
        where: {
          employee: {
            organizationMember: {
              organization: {
                id: props.organizationId,
              },
            },
          },
          status: "submitted",
          deleted_at: null,
        },
      }),
    ]);
  const actualHoursThisWeek = totalHoursThisWeek._sum?.duration_minutes ?? 0;
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      organization: {
        id: props.organizationId,
      },
      deleted_at: null,
      budget_hours: { gt: 0 },
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
      description: true,
      color_code: true,
      hrms_organization_id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      start_date: true,
      end_date: true,
      timelogs: {
        where: {
          deleted_at: null,
          date: {
            gte: new Date(
              new Date().setDate(new Date().getDate() - new Date().getDay()),
            ),
            lte: new Date(
              new Date().setDate(
                new Date().getDate() + (6 - new Date().getDay()),
              ),
            ),
          },
        },
        select: { duration_minutes: true },
      },
      tasks: {
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });
  const projectsOverBudget = projects
    .filter((project) => {
      const loggedMinutes = project.timelogs.reduce(
        (
          sum: number,
          t: {
            duration_minutes: number | null;
          },
        ) => sum + (t.duration_minutes ?? 0),
        0,
      );
      const loggedHours = loggedMinutes / 60;
      const budgetHours = project.budget_hours ?? 0;
      return budgetHours > 0 && loggedHours / budgetHours > 0.8;
    })
    .map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? "",
      color_code: project.color_code ?? "",
      organization_id: project.hrms_organization_id,
      organization_name: organization.name,
      status: typia.assert<"active" | "completed" | "archived">(project.status),
      budget_hours: project.budget_hours ?? 0,
      start_date: project.start_date
        ? toISOStringSafe(project.start_date)
        : null,
      end_date: project.end_date ? toISOStringSafe(project.end_date) : null,
      planned_hours: project.budget_hours ?? 0,
      actual_hours:
        project.timelogs.reduce(
          (
            sum: number,
            t: {
              duration_minutes: number | null;
            },
          ) => sum + (t.duration_minutes ?? 0),
          0,
        ) / 60,
      budget_utilization_percentage:
        project.budget_hours && project.budget_hours > 0
          ? (project.timelogs.reduce(
              (
                sum: number,
                t: {
                  duration_minutes: number | null;
                },
              ) => sum + (t.duration_minutes ?? 0),
              0,
            ) /
              60 /
              project.budget_hours) *
            100
          : 0,
      total_tasks: project.tasks.length,
      pending_tasks: project.tasks.filter(
        (task) => task.status === "open" || task.status === "pending",
      ).length,
      in_progress_tasks: project.tasks.filter(
        (task) => task.status === "in-progress",
      ).length,
      closed_tasks: project.tasks.filter((task) => task.status === "closed")
        .length,
      completed_tasks: project.tasks.filter(
        (task) => task.status === "completed",
      ).length,
      timelog_count: project.timelogs.length,
      created_at: toISOStringSafe(project.created_at),
      updated_at: toISOStringSafe(project.updated_at),
    }));
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      organizationMember: {
        organization: {
          id: props.organizationId,
        },
      },
      status: "active",
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      department_id: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization_member_id: true,
      role_id: true,
      position: true,
      employment_type: true,
      timelogs: {
        where: {
          deleted_at: null,
          date: {
            gte: new Date(
              new Date().setDate(new Date().getDate() - new Date().getDay()),
            ),
            lte: new Date(
              new Date().setDate(
                new Date().getDate() + (6 - new Date().getDay()),
              ),
            ),
          },
        },
        select: { duration_minutes: true },
      },
    },
  });
  const topEmployees = employees
    .sort((a, b) => {
      const aHours =
        a.timelogs.reduce(
          (
            sum: number,
            t: {
              duration_minutes: number | null;
            },
          ) => sum + (t.duration_minutes ?? 0),
          0,
        ) / 60;
      const bHours =
        b.timelogs.reduce(
          (
            sum: number,
            t: {
              duration_minutes: number | null;
            },
          ) => sum + (t.duration_minutes ?? 0),
          0,
        ) / 60;
      return bHours - aHours;
    })
    .slice(0, 5)
    .map((employee) => ({
      id: employee.id,
      display_name: employee.display_name,
      position: employee.position ?? "",
      department_id: employee.department_id ?? "",
      total_hours_logged:
        employee.timelogs.reduce(
          (
            sum: number,
            t: {
              duration_minutes: number | null;
            },
          ) => sum + (t.duration_minutes ?? 0),
          0,
        ) / 60,
      timelog_count: employee.timelogs.length,
      timesheets_submitted: 0,
      timesheets_approved: 0,
      timesheets_pending: 0,
      status: typia.assert<string>(employee.status),
    }));
  return {
    totalActiveEmployees,
    totalHoursThisWeek: parseFloat((actualHoursThisWeek / 60).toFixed(2)),
    pendingTimesheetsCount,
    projectsOverBudget,
    topEmployees,
    generatedAt: toISOStringSafe(new Date()),
  } satisfies IHrmsOrganization;
}
