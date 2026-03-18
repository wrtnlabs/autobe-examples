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
  const searchLimit = props.body.search_limit ?? 1000;
  // Validate pagination limits
  const validatedLimit = Math.min(Math.max(limit, 1), 100);
  const validatedSearchLimit = Math.min(Math.max(searchLimit, 1), 1000);
  // Calculate skip for pagination
  const skip = (page - 1) * validatedLimit;
  // Get member's selected organization from current session
  const session = await MyGlobal.prisma.hrms_member_sessions.findFirst({
    where: {
      hrms_member_id: props.member.id,
      id: props.member.session_id,
      expired_at: { gt: new Date() },
    },
    select: { current_organization_id: true },
  });
  if (!session) {
    throw new HttpException("Session not found or expired", 401);
  }
  // Validate organization_id is not null
  if (session.current_organization_id === null) {
    throw new HttpException("Organization not selected", 400);
  }
  // Build where clause (no member search filter - filter manually if needed)
  const whereClause: Prisma.hrms_organization_membersWhereInput = {
    deleted_at: null,
    hrms_organization_id: session.current_organization_id,
    ...(props.body.role_id
      ? { hrms_organization_role_id: props.body.role_id }
      : {}),
  };
  // Query with pagination and select for transformer
  const data = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: whereClause,
    skip,
    take: validatedLimit,
    orderBy: { created_at: "desc" },
    select: HrmsOrganizationMemberAtSummaryTransformer.select().select,
  });
  // Get total count
  const total = await MyGlobal.prisma.hrms_organization_members.count({
    where: whereClause,
  });
  // Calculate pagination metadata
  const totalPages = Math.ceil(total / validatedLimit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmsOrganizationMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: validatedLimit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
