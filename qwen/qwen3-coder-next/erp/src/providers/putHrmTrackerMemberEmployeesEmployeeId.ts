import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTrackerEmployeeTransformer } from "../transformers/HrmTrackerEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTrackerMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string;
  body: IHrmTrackerEmployee.IUpdate;
}): Promise<IHrmTrackerEmployee> {
  const target = await MyGlobal.prisma.hrm_tracker_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: { organization_id: true },
  });
  const memberOrg =
    await MyGlobal.prisma.hrm_tracker_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        organization_id: target.organization_id,
      },
      select: { id: true },
    });
  const updateData: Prisma.hrm_tracker_employeesUpdateInput = {
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
    ...(props.body.position !== undefined && { position: props.body.position }),
    updated_at: new Date(),
  };
  if (props.body.role_id !== undefined) {
    if (props.body.role_id === null) {
      updateData.role = { disconnect: true };
    } else {
      updateData.role = { connect: { id: props.body.role_id } };
    }
  }
  if (props.body.department_id !== undefined) {
    if (props.body.department_id === null) {
      updateData.department = { disconnect: true };
    } else {
      updateData.department = { connect: { id: props.body.department_id } };
    }
  }
  if (props.body.status === "deactivated") {
    updateData.deleted_at = new Date();
  } else if (props.body.status === "active") {
    updateData.deleted_at = null;
  }
  const updated = await MyGlobal.prisma.hrm_tracker_employees.update({
    where: { id: props.employeeId },
    data: updateData,
    ...HrmTrackerEmployeeTransformer.select(),
  });
  return await HrmTrackerEmployeeTransformer.transform(updated);
}
