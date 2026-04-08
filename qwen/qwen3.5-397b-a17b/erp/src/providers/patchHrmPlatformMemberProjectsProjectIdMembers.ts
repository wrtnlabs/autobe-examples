import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformProjectMember";
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

export async function patchHrmPlatformMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProjectMember.IRequest;
}): Promise<IPageIHrmPlatformProjectMember.ISummary> {
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const take = limit;
  const whereInput: Prisma.hrm_platform_project_membersWhereInput = {
    hrm_platform_project_id: props.projectId,
    ...(props.body.role !== undefined && { role: props.body.role }),
    ...(props.body.employeeId !== undefined && {
      hrm_platform_employee_id: props.body.employeeId,
    }),
    ...(props.body.search !== undefined && {
      employee: {
        member: {
          email: { contains: props.body.search },
        },
      },
    }),
  } satisfies Prisma.hrm_platform_project_membersWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_project_members.findMany({
    where: whereInput,
    skip,
    take,
    orderBy: { created_at: "desc" },
    ...HrmPlatformProjectMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_project_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformProjectMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmPlatformProjectMember.ISummary;
}
