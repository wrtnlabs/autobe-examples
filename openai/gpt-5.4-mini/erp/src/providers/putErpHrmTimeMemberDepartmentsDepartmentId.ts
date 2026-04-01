import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeDepartmentTransformer } from "../transformers/ErpHrmTimeDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmTimeMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmTimeDepartment.IUpdate;
}): Promise<IErpHrmTimeDepartment> {
  const current =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        parent_department_id: true,
        name: true,
        deleted_at: true,
      },
    });
  if (current.deleted_at !== null) {
    throw new HttpException("Department has been deleted", 404);
  }
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    membership.erp_hrm_time_organization_id !==
    current.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.parentDepartmentId !== undefined) {
    if (props.body.parentDepartmentId === current.id) {
      throw new HttpException("Department cannot be its own parent", 400);
    }
    if (props.body.parentDepartmentId !== null) {
      const parent =
        await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
          where: { id: props.body.parentDepartmentId },
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
            parent_department_id: true,
            deleted_at: true,
          },
        });
      if (parent.deleted_at !== null) {
        throw new HttpException("Parent department has been deleted", 404);
      }
      if (
        parent.erp_hrm_time_organization_id !==
        current.erp_hrm_time_organization_id
      ) {
        throw new HttpException(
          "Parent department must belong to the selected organization",
          400,
        );
      }
      if (parent.parent_department_id !== null) {
        throw new HttpException(
          "Department hierarchy cannot exceed one level",
          400,
        );
      }
    }
  }
  await MyGlobal.prisma.erp_hrm_time_departments.update({
    where: { id: props.departmentId },
    data: {
      ...(props.body.name !== undefined ? { name: props.body.name } : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.parentDepartmentId !== undefined
        ? {
            parentDepartment:
              props.body.parentDepartmentId === null
                ? { disconnect: true }
                : { connect: { id: props.body.parentDepartmentId } },
          }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...ErpHrmTimeDepartmentTransformer.select(),
    });
  return ErpHrmTimeDepartmentTransformer.transform(updated);
}
