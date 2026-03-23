import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerDepartmentTransformer } from "../transformers/HrmTrackerDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string;
  body: IHrmTrackerDepartment.IUpdate;
}): Promise<IHrmTrackerDepartment> {
  const existing =
    await MyGlobal.prisma.hrm_tracker_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        parent_id: true,
        name: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Department not found", 404);
  }
  const employee = await MyGlobal.prisma.hrm_tracker_employees.findFirst({
    where: {
      organization_id: existing.hrm_tracker_organization_id,
      user_id: props.member.id,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const hasOrgManagePermission =
    await MyGlobal.prisma.hrm_tracker_roles.findFirst({
      where: {
        organization: { id: existing.hrm_tracker_organization_id },
        employee_roles: {
          some: { employee_id: employee.id },
        },
        permissions: {
          some: { permission: "org:manage" },
        },
      },
    });
  if (hasOrgManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.name !== undefined) {
    const existingByName =
      await MyGlobal.prisma.hrm_tracker_departments.findFirst({
        where: {
          organization: { id: existing.hrm_tracker_organization_id },
          name: props.body.name,
          id: {
            not: props.departmentId,
          },
          deleted_at: null,
        },
      });
    if (existingByName !== null) {
      throw new HttpException("Department name already exists", 409);
    }
  }
  if (props.body.parent_id !== undefined) {
    const parentId = props.body.parent_id ?? undefined;
    const parent = await MyGlobal.prisma.hrm_tracker_departments.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        deleted_at: true,
      },
    });
    if (parent === null) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parent.deleted_at !== null) {
      throw new HttpException("Parent department not found", 404);
    }
    if (
      parent.hrm_tracker_organization_id !==
      existing.hrm_tracker_organization_id
    ) {
      throw new HttpException(
        "Cross-organization parent department violation",
        400,
      );
    }
    const isSelfReference = parent.id === props.departmentId;
    if (isSelfReference) {
      throw new HttpException("Self-reference not allowed", 400);
    }
    const hasCircularReference =
      await MyGlobal.prisma.hrm_tracker_departments.findFirst({
        where: {
          parent_id: props.departmentId,
          id: parent.id,
          deleted_at: null,
        },
      });
    if (hasCircularReference !== null) {
      throw new HttpException(
        "Circular parent-child relationship not allowed",
        400,
      );
    }
  }
  const updated = await MyGlobal.prisma.hrm_tracker_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description ?? null,
      }),
      ...(props.body.parent_id !== undefined && {
        parent_id: props.body.parent_id ?? null,
      }),
      updated_at: new Date().toISOString(),
    },
    ...HrmTrackerDepartmentTransformer.select(),
  });
  return await HrmTrackerDepartmentTransformer.transform(updated);
}
