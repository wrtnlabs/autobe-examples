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

export async function getHrmsMemberTimersTimerId(props: {
  member: MemberPayload;
  timerId: string & tags.Format<"uuid">;
}): Promise<IHrmsTimer> {
  // Find the employee associated with this member through organization membership
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      organizationMember: {
        hrms_member_id: props.member.id,
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // Query timer with all relations needed for the response
  // Ownership validation in WHERE clause ensures member can only access their own timers
  const timer = await MyGlobal.prisma.hrms_timers.findUniqueOrThrow({
    where: {
      id: props.timerId,
      hrms_employee_id: employee.id,
      deleted_at: null,
    },
    ...HrmsTimerTransformer.select(),
  });
  // Transform database result to API response
  return await HrmsTimerTransformer.transform(timer);
}
