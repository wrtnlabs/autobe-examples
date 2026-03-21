import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmInvitation";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmInvitation";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmInvitationAtSummaryTransformer } from "../transformers/ErpHrmInvitationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberInvitations(props: {
  member: MemberPayload;
  body: IErpHrmInvitation.IRequest;
}): Promise<IPageIErpHrmInvitation.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Organization context not found", 400);
  }
  const whereInput = {
    erp_hrm_organization_id: employee.erp_hrm_organization_id,
    deleted_at: null,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
  } satisfies Prisma.erp_hrm_invitationsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_invitations.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmInvitationAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_invitations.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmInvitationAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
