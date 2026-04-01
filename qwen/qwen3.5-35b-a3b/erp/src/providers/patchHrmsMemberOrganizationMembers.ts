import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationMember";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationMemberAtSummaryTransformer } from "../transformers/HrmsOrganizationMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IHrmsOrganizationMember.IRequest;
}): Promise<IPageIHrmsOrganizationMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const skip = (validatedPage - 1) * validatedLimit;
  // Get organization context from session
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: { id: props.member.session_id },
    select: { current_organization_id: true },
  });
  if (!session) {
    throw new HttpException("Unauthorized", 401);
  }
  if (!session.current_organization_id) {
    throw new HttpException("No organization context", 400);
  }
  const whereInput: Prisma.hrms_organization_membersWhereInput = {
    deleted_at: null,
    organization: {
      id: session.current_organization_id,
    },
  };
  if (props.body.search) {
    whereInput.member = {
      OR: [
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    };
  }
  if (props.body.role_id) {
    whereInput.organizationRole = { id: props.body.role_id };
  }
  const data = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: whereInput,
    skip,
    take: validatedLimit,
    orderBy: { created_at: "desc" },
    ...HrmsOrganizationMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_organization_members.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmsOrganizationMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsOrganizationMember.ISummary;
}
