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

export async function getHrmsMemberTimerActive(props: {
  member: MemberPayload;
}): Promise<IHrmsTimer | null> {
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (organizationMember === null) {
    return null;
  }
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organization_member_id: organizationMember.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    return null;
  }
  const activeTimer = await MyGlobal.prisma.hrms_timers.findFirst({
    where: {
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
    ...HrmsTimerTransformer.select(),
  });
  if (activeTimer === null) {
    return null;
  }
  return await HrmsTimerTransformer.transform(activeTimer);
}
