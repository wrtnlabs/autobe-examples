import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingDepartmentTransformer } from "../transformers/HrmTimeTrackingDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingDepartment.IUpdate;
}): Promise<IHrmTimeTrackingDepartment> {
  const current =
    await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
        parent_department_id: true,
      },
    });
  const organizationId = current.hrm_time_tracking_organization_id;
  if (
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    const parent =
      await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
        where: { id: props.body.parentDepartmentId },
        select: {
          id: true,
          hrm_time_tracking_organization_id: true,
          parent_department_id: true,
        },
      });
    if (parent.hrm_time_tracking_organization_id !== organizationId) {
      throw new HttpException("Forbidden", 403);
    }
    if (parent.id === current.id) {
      throw new HttpException("Parent department cannot be itself", 400);
    }
    if (parent.parent_department_id !== null) {
      throw new HttpException("Department hierarchy depth exceeded", 400);
    }
  }
  try {
    await MyGlobal.prisma.hrm_time_tracking_departments.update({
      where: { id: props.departmentId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.parentDepartmentId !== undefined && {
          parent_department_id: props.body.parentDepartmentId,
        }),
        updated_at: toISOStringSafe(new Date())
          .slice(0, 19)
          .replace("T", " ") as unknown as never,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Department name must be unique within the organization",
        400,
      );
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...HrmTimeTrackingDepartmentTransformer.select(),
    });
  return await HrmTimeTrackingDepartmentTransformer.transform(updated);
}
