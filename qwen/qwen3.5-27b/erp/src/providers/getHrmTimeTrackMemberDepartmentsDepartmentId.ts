import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackDepartment";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackDepartmentTransformer } from "../transformers/HrmTimeTrackDepartmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberDepartmentsDepartmentId(props: {
  member: MemberPayload;
  departmentId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackDepartment> {
  const department =
    await MyGlobal.prisma.hrm_time_track_departments.findUniqueOrThrow({
      where: {
        id: props.departmentId,
        deleted_at: null,
      },
      ...HrmTimeTrackDepartmentTransformer.select(),
    });
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (
    memberEmployee === null ||
    memberEmployee.hrm_time_track_organization_id !== department.organization.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  return await HrmTimeTrackDepartmentTransformer.transform(department);
}
