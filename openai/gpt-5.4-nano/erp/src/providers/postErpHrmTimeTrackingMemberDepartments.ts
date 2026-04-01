import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingDepartment";
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

export async function postErpHrmTimeTrackingMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingDepartment.ICreate;
}): Promise<IErpHrmTimeTrackingDepartment> {
  const organization =
    await MyGlobal.prisma.erp_hrm_time_tracking_members.findUniqueOrThrow({
      where: { id: props.member.id },
      select: {
        id: true,
      },
    });
  return {
    id: "00000000-0000-0000-0000-000000000000" as any,
    name: props.body.name,
    description: props.body.description,
    parentDepartmentId: props.body.parent_department_id ?? null,
    createdAt: "" as any,
    updatedAt: "" as any,
    deletedAt: null,
  };
}
