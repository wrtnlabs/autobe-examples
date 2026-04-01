import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsTimerTransformer } from "../transformers/HrmsTimerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberOrganizationsOrganizationIdTimer(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  timerId: string & tags.Format<"uuid">;
  body: IHrmsTimer.IUpdate;
}): Promise<IHrmsTimer> {
  const member = await MyGlobal.prisma.hrms_members.findFirst({
    where: {
      id: props.member.id,
      deleted_at: null,
    },
  });
  if (member === null) {
    throw new HttpException("Member not found", 404);
  }
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (orgMember === null) {
    throw new HttpException("Organization membership not found", 404);
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: orgMember.id,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: { id: props.timerId },
  });
  if (timer.deleted_at !== null || timer.hrms_employee_id !== employee.id) {
    throw new HttpException("Timer not found or not owned by employee", 404);
  }
  const updates: Prisma.hrms_timersUpdateInput = {};
  if (props.body.description !== undefined) {
    updates.description = props.body.description;
  }
  updates.updated_at = new Date();
  const updatedTimer = await MyGlobal.prisma.hrms_timers.update({
    where: { id: timer.id },
    data: updates,
    ...HrmsTimerTransformer.select(),
  });
  return await HrmsTimerTransformer.transform(updatedTimer);
}
