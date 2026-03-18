import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeRoleHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRoleHistory";
import { IHrmTimeTrackingEmployeeRoleHistoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRoleHistoryItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeRoleHistoryTransformer } from "../transformers/HrmTimeTrackingEmployeeRoleHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberEmployeesEmployeeIdRolesHistory(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeRoleHistory> {
  await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
    where: {
      id: props.employeeId,
    },
    select: {
      id: true,
    },
  });
  const history =
    await MyGlobal.prisma.hrm_time_tracking_employee_roles.findMany({
      where: {
        hrm_time_tracking_employee_id: props.employeeId,
        deleted_at: null,
      },
      orderBy: [
        {
          effective_from: "desc",
        },
        {
          created_at: "desc",
        },
      ],
      ...HrmTimeTrackingEmployeeRoleHistoryTransformer.select(),
    });
  return await HrmTimeTrackingEmployeeRoleHistoryTransformer.transform(history);
}
