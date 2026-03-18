import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeTransformer } from "../transformers/HrmTimeTrackingEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingEmployee.IUpdate;
}): Promise<IHrmTimeTrackingEmployee> {
  const current =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        organization_id: true,
      },
    });
  if (
    current.organization_id !==
    (
      props.member as {
        organization_id?: string & tags.Format<"uuid">;
      }
    ).organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.department_id !== undefined &&
    props.body.department_id !== null
  ) {
    const department =
      await MyGlobal.prisma.hrm_time_tracking_departments.findFirst({
        where: {
          id: props.body.department_id,
          organization: { id: current.organization_id },
        },
        select: {
          id: true,
        },
      });
    if (department === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  await MyGlobal.prisma.hrm_time_tracking_employees.update({
    where: { id: props.employeeId },
    data: {
      ...(props.body.department_id !== undefined && {
        department_id: props.body.department_id,
      }),
      ...(props.body.position_title !== undefined && {
        position_title: props.body.position_title,
      }),
      ...(props.body.employment_type !== undefined && {
        employment_type: props.body.employment_type,
      }),
      ...(props.body.status !== undefined && {
        status: props.body.status,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      ...HrmTimeTrackingEmployeeTransformer.select(),
    });
  return await HrmTimeTrackingEmployeeTransformer.transform(updated);
}
