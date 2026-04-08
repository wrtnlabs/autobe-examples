import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformEmployeeInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformEmployeeInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeInvitationAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberEmployeeInvitations(props: {
  member: MemberPayload;
  body: IHrmPlatformEmployeeInvitation.IRequest;
}): Promise<IPageIHrmPlatformEmployeeInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { hrm_platform_organization_id: true },
    });
  if (!membership) {
    throw new HttpException("No organization context", 403);
  }
  const organizationId = membership.hrm_platform_organization_id;
  const whereInput: Prisma.hrm_platform_employee_invitationsWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
    ...(props.body.search && {
      email: { contains: props.body.search },
    }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.department_id && {
      department_id: props.body.department_id,
    }),
    ...(props.body.employment_type && {
      employment_type: props.body.employment_type,
    }),
  };
  const data = await MyGlobal.prisma.hrm_platform_employee_invitations.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { invited_at: "desc" },
      ...HrmPlatformEmployeeInvitationAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_platform_employee_invitations.count({
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
      HrmPlatformEmployeeInvitationAtSummaryTransformer.transform,
    ),
  };
}
