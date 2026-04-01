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
import { ErpHrmTimeTrackingDepartmentTransformer } from "../transformers/ErpHrmTimeTrackingDepartmentTransformer";
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
        name: true,
        description: true,
        parent_department_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (props.body.parentDepartmentId !== undefined) {
    const nextParentId = props.body.parentDepartmentId;
    if (nextParentId !== null) {
      const parent =
        await MyGlobal.prisma.erp_hrm_time_tracking_departments.findUniqueOrThrow(
          {
            where: { id: nextParentId },
            select: {
              id: true,
              erp_hrm_time_tracking_organization_id: true,
              parent_department_id: true,
              deleted_at: true,
            },
          },
        );
      if (
        parent.erp_hrm_time_tracking_organization_id !==
        department.erp_hrm_time_tracking_organization_id
      ) {
        throw new HttpException("Invalid parent department organization", 400);
      }
      if (parent.parent_department_id !== null) {
        throw new HttpException("Invalid parent department nesting", 400);
      }
    }
  }
  const updated =
    await MyGlobal.prisma.erp_hrm_time_tracking_departments.update({
      where: { id: props.departmentId },
      data: {
        name: props.body.name,
        description:
          props.body.description === undefined
            ? department.description
            : (props.body.description ?? null),
        ...(props.body.parentDepartmentId === undefined
          ? {}
          : { parent_department_id: props.body.parentDepartmentId }),
      },
      select: {
        ...ErpHrmTimeTrackingDepartmentTransformer.select(),
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        erp_hrm_time_tracking_organization_id: true,
        name: true,
        description: true,
        parent_department_id: true,
      },
    });
  const transformed = await ErpHrmTimeTrackingDepartmentTransformer.transform(
    updated as unknown as Parameters<
      typeof ErpHrmTimeTrackingDepartmentTransformer.transform
    >[0],
  );
  return transformed;
}
