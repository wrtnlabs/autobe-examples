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
  // 1. Validate department exists and is not soft-deleted
  const department =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        deleted_at: true,
      } satisfies Prisma.hrm_platform_departmentsSelect,
    });
  // 2. Check name uniqueness within organization (exclude current department)
  if (props.body.name !== undefined) {
    const existing = await MyGlobal.prisma.hrm_platform_departments.findFirst({
      where: {
        hrm_platform_organization_id: department.hrm_platform_organization_id,
        name: props.body.name,
        id: { not: props.departmentId },
        deleted_at: null,
      } satisfies Prisma.hrm_platform_departmentsWhereInput,
    });
    if (existing) {
      throw new HttpException(
        "Department name already exists in this organization",
        400,
      );
    }
  }
  // 3. Validate parent_department_id if provided
  if (props.body.parent_department_id !== undefined) {
    if (props.body.parent_department_id !== null) {
      // Validate parent exists, not deleted, and in same organization
      const parent = await MyGlobal.prisma.hrm_platform_departments.findUnique({
        where: { id: props.body.parent_department_id },
        select: {
          id: true,
          hrm_platform_organization_id: true,
          deleted_at: true,
          parent_department_id: true,
        } satisfies Prisma.hrm_platform_departmentsSelect,
      });
      if (!parent) {
        throw new HttpException("Parent department not found", 400);
      }
      if (parent.deleted_at !== null) {
        throw new HttpException("Cannot set deleted department as parent", 400);
      }
      if (
        parent.hrm_platform_organization_id !==
        department.hrm_platform_organization_id
      ) {
        throw new HttpException(
          "Parent department must be in the same organization",
          400,
        );
      }
      // Check for circular reference
      if (parent.parent_department_id === props.departmentId) {
        throw new HttpException(
          "Cannot create circular reference in department hierarchy",
          400,
        );
      }
    }
  }
  // 4. Update the department
  await MyGlobal.prisma.hrm_platform_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.parent_department_id !== undefined && {
        parent_department_id: props.body.parent_department_id,
      }),
      updated_at: new Date(),
    } satisfies Prisma.hrm_platform_departmentsUpdateInput,
  });
  // 5. Return updated department
  const updated =
    await MyGlobal.prisma.hrm_platform_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmPlatformDepartmentTransformer.select(),
    });
  return await HrmPlatformDepartmentTransformer.transform(updated);
}
