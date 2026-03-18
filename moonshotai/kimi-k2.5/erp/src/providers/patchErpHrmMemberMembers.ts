import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmOrganizationMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberAtSummaryTransformer } from "../transformers/ErpHrmOrganizationMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberMembers(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationMember.IRequest;
}): Promise<IPageIErpHrmOrganizationMember.ISummary> {
  // Get session to retrieve member context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_member_id: true },
    });
  // Get organization context - use the first active membership
  // In a real scenario, the organization context should come from session or explicit parameter
  const orgMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: session.erp_hrm_member_id,
        deleted_at: null,
      },
      select: { organization_id: true },
      orderBy: { created_at: "desc" },
    });
  const organizationId = orgMembership.organization_id;
  // Build base where clause
  const whereConditions: Prisma.erp_hrm_organization_membersWhereInput[] = [
    { organization_id: organizationId },
    { deleted_at: null },
  ];
  // Role filter
  if (props.body.roleIds !== undefined && props.body.roleIds.length > 0) {
    whereConditions.push({ role_id: { in: props.body.roleIds } });
  }
  // Active status filter
  if (props.body.isActive !== undefined) {
    whereConditions.push({ is_active: props.body.isActive });
  }
  // Employment type filter
  if (props.body.employmentType !== undefined) {
    const employmentTypes = Array.isArray(props.body.employmentType)
      ? props.body.employmentType
      : [props.body.employmentType];
    whereConditions.push({ employment_type: { in: employmentTypes } });
  }
  // Department filter with 'unassigned' sentinel support
  if (
    props.body.departmentIds !== undefined &&
    props.body.departmentIds.length > 0
  ) {
    const hasUnassigned = props.body.departmentIds.includes("unassigned");
    const departmentUuids = props.body.departmentIds.filter(
      (id): id is string & tags.Format<"uuid"> => id !== "unassigned",
    );
    if (hasUnassigned && departmentUuids.length > 0) {
      whereConditions.push({
        OR: [
          { department_id: null },
          { department_id: { in: departmentUuids } },
        ],
      });
    } else if (hasUnassigned) {
      whereConditions.push({ department_id: null });
    } else if (departmentUuids.length > 0) {
      whereConditions.push({ department_id: { in: departmentUuids } });
    }
  }
  // Search filter across member profile and position
  if (props.body.search !== undefined && props.body.search.length > 0) {
    const searchTerm = props.body.search;
    whereConditions.push({
      OR: [
        { user: { first_name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { last_name: { contains: searchTerm, mode: "insensitive" } } },
        { user: { email: { contains: searchTerm, mode: "insensitive" } } },
        { position: { contains: searchTerm, mode: "insensitive" } },
      ],
    });
  }
  const whereInput: Prisma.erp_hrm_organization_membersWhereInput = {
    AND: whereConditions,
  };
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  // Handle cursor-based pagination if cursor provided, otherwise use offset
  let skip: number | undefined;
  let cursor: Prisma.erp_hrm_organization_membersWhereUniqueInput | undefined;
  if (props.body.cursor !== undefined && props.body.cursor !== null) {
    // Decode cursor - assuming base64 encoded id
    try {
      const decodedId = Buffer.from(props.body.cursor, "base64").toString(
        "utf-8",
      );
      cursor = { id: decodedId };
    } catch {
      // Invalid cursor, ignore and use offset
    }
  }
  if (cursor === undefined) {
    const page = props.body.page ?? 1;
    skip = (page - 1) * limit;
  }
  // Execute queries sequentially for better error handling
  const data = await MyGlobal.prisma.erp_hrm_organization_members.findMany({
    where: whereInput,
    ...(skip !== undefined && { skip }),
    ...(cursor !== undefined && { cursor, skip: 1 }),
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmOrganizationMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_organization_members.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmOrganizationMemberAtSummaryTransformer.transform,
  );
  // Calculate pagination metadata
  const currentPage = props.body.page ?? 1;
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
