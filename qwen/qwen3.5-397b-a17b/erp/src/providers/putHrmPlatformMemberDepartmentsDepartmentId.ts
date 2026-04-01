import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformDepartmentTransformer } from "../transformers/HrmPlatformDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmPlatformDepartment.IUpdate;
}): Promise<IHrmPlatformDepartment> {
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId, deleted_at: null },
      select: { id: true, organization_id: true, name: true },
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        organization_id: department.organization_id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: "org:manage",
        deleted_at: null,
      },
    });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existingName =
      await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          organization_id: department.organization_id,
          name: props.body.name,
          id: { not: props.departmentId },
          deleted_at: null,
        },
      });
    if (existingName) {
      throw new HttpException("Department name already exists", 409);
    }
  }
  if (props.body.parentDepartmentId !== undefined) {
    if (props.body.parentDepartmentId !== null) {
      const parent =
        await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
          where: { id: props.body.parentDepartmentId, deleted_at: null },
          select: {
            id: true,
            organization_id: true,
            parent_department_id: true,
          },
        });
      if (parent.organization_id !== department.organization_id) {
        throw new HttpException(
          "Parent department must belong to same organization",
          400,
        );
      }
      if (parent.parent_department_id !== null) {
        throw new HttpException(
          "Cannot assign parent that already has a parent (one-level hierarchy)",
          400,
        );
      }
      if (parent.id === props.departmentId) {
        throw new HttpException("Cannot set department as its own parent", 400);
      }
      const isChild = await MyGlobal.prisma.hrm_platform_departments.findFirst({
        where: {
          parent_department_id: props.departmentId,
          id: props.body.parentDepartmentId,
          deleted_at: null,
        },
      });
      if (isChild) {
        throw new HttpException("Circular reference detected", 400);
      }
    }
  }
  const updateData: Prisma.hrm_platform_departmentsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.parentDepartmentId !== undefined && {
      parentDepartment: props.body.parentDepartmentId
        ? { connect: { id: props.body.parentDepartmentId } }
        : { disconnect: true },
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: updateData,
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
