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
import { ErpHrmDepartmentTransformer } from "../transformers/ErpHrmDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmDepartment.IUpdate;
}): Promise<IErpHrmDepartment> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
      status: "active",
    },
    select: {
      role: {
        select: {
          name: true,
          is_builtin: true,
          rolePermissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  });
  const hasOrgManage: boolean = employee.role.is_builtin
    ? employee.role.name === "Owner" || employee.role.name === "Manager"
    : employee.role.rolePermissions.some(
        (rp) => rp.permission.key === "org:manage",
      );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  const department =
    await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        name: true,
        description: true,
        parent_id: true,
        erp_hrm_organization_id: true,
        deleted_at: true,
      },
    });
  if (department.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  if (department.erp_hrm_organization_id !== organizationId) {
    throw new HttpException("Department not found", 404);
  }
  const changes: Array<{
    field: string;
    old: unknown;
    new: unknown;
  }> = [];
  if (props.body.name !== undefined && props.body.name !== department.name) {
    const duplicate = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        erp_hrm_organization_id: organizationId,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.departmentId },
      },
      select: { id: true },
    });
    if (duplicate) {
      throw new HttpException(
        "Department name already exists in this organization",
        409,
      );
    }
    changes.push({ field: "name", old: department.name, new: props.body.name });
  }
  if (props.body.parent_id !== undefined) {
    if (props.body.parent_id !== null) {
      const targetParent = await MyGlobal.prisma.erp_hrm_departments.findFirst({
        where: {
          id: props.body.parent_id,
          erp_hrm_organization_id: organizationId,
          deleted_at: null,
        },
        select: { id: true, parent_id: true },
      });
      if (!targetParent) {
        throw new HttpException("Parent department not found", 400);
      }
      if (targetParent.parent_id !== null) {
        throw new HttpException(
          "Parent department must be a top-level department",
          400,
        );
      }
      if (props.body.parent_id === props.departmentId) {
        throw new HttpException("A department cannot be its own parent", 400);
      }
      let ancestorId: string | null = targetParent.parent_id;
      while (ancestorId !== null) {
        if (ancestorId === props.departmentId) {
          throw new HttpException(
            "Cannot create circular department hierarchy",
            400,
          );
        }
        const parentRecord: {
          parent_id: string | null;
        } | null = await MyGlobal.prisma.erp_hrm_departments.findUnique({
          where: { id: ancestorId },
          select: { parent_id: true },
        });
        ancestorId = parentRecord?.parent_id ?? null;
      }
    }
    const currentParentId: string | null = department.parent_id;
    if (props.body.parent_id !== currentParentId) {
      changes.push({
        field: "parent_id",
        old: currentParentId,
        new: props.body.parent_id,
      });
    }
  }
  if (props.body.description !== undefined) {
    const currentDesc: string | null = department.description;
    if (props.body.description !== currentDesc) {
      changes.push({
        field: "description",
        old: currentDesc,
        new: props.body.description,
      });
    }
  }
  await MyGlobal.prisma.erp_hrm_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_id !== undefined && {
        parent:
          props.body.parent_id === null
            ? { disconnect: true }
            : { connect: { id: props.body.parent_id } },
      }),
      updated_at: new Date(),
    },
  });
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      user_id: props.member.id,
      organization_id: organizationId,
      action_type: "department_updated",
      target_entity: "department",
      target_id: props.departmentId,
      details: changes.length > 0 ? JSON.stringify({ changes }) : null,
      created_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
    where: { id: props.departmentId },
    ...ErpHrmDepartmentTransformer.select(),
  });
  return await ErpHrmDepartmentTransformer.transform(updated);
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmMemberDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   departmentId: string & tags.Format<"uuid">;
//   body: IErpHrmDepartment.IUpdate;
// }): Promise<IErpHrmDepartment> {
//   await MyGlobal.prisma.erp_hrm_departments.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmDepartmentTransformer.select(),
//   });
//   return await ErpHrmDepartmentTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------