import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const department =
    await MyGlobal.prisma.hrm_time_tracking_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        id: true,
        hrm_time_tracking_organization_id: true,
      },
    });
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.hrm_time_tracking_employees.updateMany({
      where: {
        organization_id: department.hrm_time_tracking_organization_id,
        department_id: department.id,
      },
      data: {
        department_id: null,
      },
    });
    await prisma.hrm_time_tracking_departments.delete({
      where: {
        id: department.id,
      },
    });
  });
}
