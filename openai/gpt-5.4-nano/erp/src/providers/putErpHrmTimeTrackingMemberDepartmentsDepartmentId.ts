import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
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

export async function putErpHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTrackingDepartment.IUpdate;
}): Promise<IErpHrmTimeTrackingDepartment> {
  const department =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        erp_hrm_time_tracking_organization_id: true,
        parent_department_id: true,
        name: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (department.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const organizationId = department.erp_hrm_time_tracking_organization_id;
  const hasParentChange = props.body.parentDepartmentId !== undefined;
  if (
    hasParentChange &&
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    const parent =
      await MyGlobal.prisma.erp_hrm_time_tracking_departments.findUniqueOrThrow(
        {
          where: { id: props.body.parentDepartmentId },
          select: {
            id: true,
            erp_hrm_time_tracking_organization_id: true,
            parent_department_id: true,
            deleted_at: true,
          },
        },
      );
    if (parent.deleted_at !== null) {
      throw new HttpException("Not Found", 404);
    }
    if (parent.erp_hrm_time_tracking_organization_id !== organizationId) {
      throw new HttpException("Invalid parent department organization", 400);
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException("Invalid nesting depth", 400);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_time_tracking_departments.update({
      where: { id: props.departmentId },
      data: {
        name: props.body.name,
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.parentDepartmentId !== undefined && {
          parent_department_id: props.body.parentDepartmentId,
        }),
        updated_at: new Date().toISOString(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        name: true,
        description: true,
        parentDepartment: { select: { id: true } },
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  return {
    id: updated.id,
    name: updated.name,
    description: updated.description ?? null,
    parentDepartmentId: updated.parentDepartment?.id ?? null,
    createdAt: updated.created_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    updatedAt: updated.updated_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    deletedAt: updated.deleted_at?.toISOString() ?? null,
  } satisfies IErpHrmTimeTrackingDepartment;
}
