import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectMemberAtSummaryTransformer } from "../transformers/HrmPlatformProjectMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberProjectsMy(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformProjectMember.ISummary[]> {
  const employees = await MyGlobal.prisma.hrm_platform_employees.findMany({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const employeeIds = employees.map((e) => e.id);
  const memberships =
    await MyGlobal.prisma.hrm_platform_project_members.findMany({
      where: {
        hrm_platform_employee_id: { in: employeeIds },
        deleted_at: null,
      },
      ...HrmPlatformProjectMemberAtSummaryTransformer.select(),
      orderBy: {
        created_at: "desc",
      },
    });
  return await ArrayUtil.asyncMap(
    memberships,
    HrmPlatformProjectMemberAtSummaryTransformer.transform,
  );
}
