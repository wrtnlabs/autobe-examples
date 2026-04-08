import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
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
  const currentDepartment =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        parent_department_id: true,
        name: true,
      },
    });
  const organizationId = currentDepartment.erp_hrm_time_organization_id;
  if (
    props.body.parentDepartmentId !== undefined &&
    props.body.parentDepartmentId !== null
  ) {
    if (props.body.parentDepartmentId === props.departmentId) {
      throw new HttpException(
        "Parent department cannot be the department itself",
        400,
      );
    }
    const parentDepartment =
      await MyGlobal.prisma.erp_hrm_time_departments.findFirst({
        where: {
          id: props.body.parentDepartmentId,
          erp_hrm_time_organization_id: organizationId,
        },
        select: {
          id: true,
          parent_department_id: true,
        },
      });
    if (parentDepartment === null) {
      throw new HttpException("Parent department not found", 400);
    }
    if (parentDepartment.parent_department_id !== null) {
      throw new HttpException(
        "Parent department hierarchy is limited to one level",
        400,
      );
    }
  }
  const duplicateDepartment =
    await MyGlobal.prisma.erp_hrm_time_departments.findFirst({
      where: {
        erp_hrm_time_organization_id: organizationId,
        name: props.body.name,
        id: { not: props.departmentId },
      },
      select: {
        id: true,
      },
    });
  if (duplicateDepartment !== null) {
    throw new HttpException(
      "Department name already exists in the organization",
      400,
    );
  }
  await MyGlobal.prisma.erp_hrm_time_departments.update({
    where: { id: props.departmentId },
    data: {
      name: props.body.name,
      description:
        props.body.description === undefined
          ? undefined
          : props.body.description,
      parent_department_id:
        props.body.parentDepartmentId === undefined
          ? undefined
          : props.body.parentDepartmentId,
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_departments.findUniqueOrThrow({
      where: { id: props.departmentId },
      ...ErpHrmTimeDepartmentTransformer.select(),
    });
  return await ErpHrmTimeDepartmentTransformer.transform(updated);
}
