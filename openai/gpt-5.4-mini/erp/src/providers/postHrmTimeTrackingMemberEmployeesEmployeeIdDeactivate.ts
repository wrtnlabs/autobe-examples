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

export async function postHrmTimeTrackingMemberEmployeesEmployeeIdDeactivate(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployee> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      ...HrmTimeTrackingEmployeeTransformer.select(),
    });
  if (employee.status !== "deactivated") {
    await MyGlobal.prisma.hrm_time_tracking_employees.update({
      where: {
        id: props.employeeId,
      },
      data: {
        status: "deactivated",
      },
    });
  }
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
      },
      ...HrmTimeTrackingEmployeeTransformer.select(),
    });
  return await HrmTimeTrackingEmployeeTransformer.transform(updated);
}
