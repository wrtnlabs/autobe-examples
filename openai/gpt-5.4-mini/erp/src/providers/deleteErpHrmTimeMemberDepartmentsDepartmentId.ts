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

export async function deleteErpHrmTimeMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const department = await prisma.erp_hrm_time_departments.findFirstOrThrow({
      where: {
        id: props.departmentId,
      },
      select: {
        id: true,
      },
    });
    await prisma.erp_hrm_time_employees.updateMany({
      where: {
        erp_hrm_time_department_id: department.id,
      },
      data: {
        erp_hrm_time_department_id: null,
      },
    });
    await prisma.erp_hrm_time_departments.delete({
      where: {
        id: department.id,
      },
    });
  });
}
