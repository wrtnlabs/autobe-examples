import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartmentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartmentReport";
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

export async function getHrmTimeTrackMemberReportsDepartments(props: {
  member: MemberPayload;
}): Promise<IHrmTimeTrackDepartmentReport.IStatistic> {
  // Get organization_id from member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findFirst({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Session not found", 404);
  }
  const organizationId = session.hrm_time_track_organization_id;
  // Query all active departments with employee counts
  const departments = await MyGlobal.prisma.hrm_time_track_departments.findMany(
    {
      where: {
        hrm_time_track_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        parent_department_id: true,
        employees: {
          where: {
            deleted_at: null,
          },
          select: {
            id: true,
          },
        },
      },
    },
  );
  // Build department map for tree construction
  const departmentMap = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      employee_count: number;
      children: IHrmTimeTrackDepartmentReport.IStatistic[];
    }
  >();
  // Populate department map with employee counts
  for (const dept of departments) {
    departmentMap.set(dept.id, {
      id: dept.id,
      name: dept.name,
      description: dept.description,
      employee_count: dept.employees.length,
      children: [],
    });
  }
  // Build tree structure by linking children to parents
  const roots: {
    id: string;
    name: string;
    description: string | null;
    employee_count: number;
    children: IHrmTimeTrackDepartmentReport.IStatistic[];
  }[] = [];
  for (const [id, dept] of departmentMap) {
    const department = departments.find((d) => d.id === id);
    if (department === undefined) {
      continue;
    }
    if (department.parent_department_id === null) {
      // Root level department
      roots.push({
        id: dept.id,
        name: dept.name,
        description: dept.description,
        employee_count: dept.employee_count,
        children: dept.children,
      });
    } else {
      // Child department - find parent and add to its children
      const parent = departmentMap.get(department.parent_department_id);
      if (parent) {
        parent.children.push({
          id: dept.id,
          name: dept.name,
          description: dept.description,
          employee_count: dept.employee_count,
          children: dept.children,
        } satisfies IHrmTimeTrackDepartmentReport.IStatistic);
      }
    }
  }
  // Sort all children arrays alphabetically by name (recursive sort)
  const sortChildren = (
    stat: IHrmTimeTrackDepartmentReport.IStatistic,
  ): void => {
    stat.children.sort((a, b) => a.name.localeCompare(b.name));
    for (const child of stat.children) {
      sortChildren(child);
    }
  };
  // Sort roots and their children
  roots.sort((a, b) => a.name.localeCompare(b.name));
  for (const root of roots) {
    sortChildren(root);
  }
  // Calculate total employee count across all departments
  const totalEmployeeCount = departments.reduce(
    (sum, d) => sum + d.employees.length,
    0,
  );
  // Return a virtual root containing all root-level departments
  return {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Organization",
    description: null,
    employee_count: totalEmployeeCount,
    children: roots.map(
      (root) =>
        ({
          id: root.id,
          name: root.name,
          description: root.description,
          employee_count: root.employee_count,
          children: root.children,
        }) satisfies IHrmTimeTrackDepartmentReport.IStatistic,
    ),
  } satisfies IHrmTimeTrackDepartmentReport.IStatistic;
}
