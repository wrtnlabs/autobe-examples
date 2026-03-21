import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
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

export async function getErpHrmMemberDepartmentsTree(props: {
  member: MemberPayload;
}): Promise<IErpHrmDepartment.ITree> {
  // Get the member's employee record to find the organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Query all departments for the organization
  const departments = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: {
      erp_hrm_organization_id: employee.erp_hrm_organization_id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      parent_id: true,
    },
    orderBy: {
      name: "asc",
    },
  });
  // Build a map of department id to department for quick lookup
  const departmentMap = new Map<string, IErpHrmDepartment.ITree>();
  // Initialize all departments with empty children arrays
  for (const dept of departments) {
    departmentMap.set(dept.id, {
      id: dept.id as string & tags.Format<"uuid">,
      name: dept.name,
      description: dept.description,
      children: [],
    });
  }
  // Build the tree by attaching children to parents
  const roots: IErpHrmDepartment.ITree[] = [];
  for (const dept of departments) {
    const treeNode = departmentMap.get(dept.id)!;
    if (dept.parent_id === null) {
      // This is a root department
      roots.push(treeNode);
    } else {
      // This department has a parent - attach to parent's children
      const parent = departmentMap.get(dept.parent_id);
      if (parent) {
        parent.children.push(treeNode);
      }
    }
  }
  // Return single root object (first root) or first root with all siblings as children
  if (roots.length === 0) {
    throw new HttpException("No departments found", 404);
  }
  // Return first root with siblings attached
  const firstRoot = roots[0];
  return {
    id: firstRoot.id,
    name: firstRoot.name,
    description: firstRoot.description,
    children: roots.slice(1).concat(firstRoot.children),
  } satisfies IErpHrmDepartment.ITree;
}
