import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleAtSummaryTransformer } from "../transformers/ErpHrmRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmRole.IRequest;
}): Promise<IPageIErpHrmRole.ISummary> {
  // Get organization member to determine current organization context
  // Member selects organization context during login/session
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  const organizationId = orgMember.organization_id;
  // Pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build dynamic where clause for filters
  const whereInput: Prisma.erp_hrm_rolesWhereInput = {
    organization_id: organizationId,
    deleted_at: null,
  };
  // Name filter (case-insensitive partial match)
  if (props.body.name !== null) {
    whereInput.name = {
      contains: props.body.name,
      mode: "insensitive",
    };
  }
  // Built-in role filter
  if (props.body.is_builtin !== null) {
    whereInput.is_builtin = props.body.is_builtin;
  }
  // Created at range filter
  if (
    props.body.created_at_from !== null ||
    props.body.created_at_to !== null
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_from !== null) {
      whereInput.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== null) {
      whereInput.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  // Parse sort parameter (format: field:direction)
  let orderBy: Prisma.erp_hrm_rolesOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (props.body.sort !== null) {
    const [field, direction] = props.body.sort.split(":");
    const validFields: Array<
      keyof Prisma.erp_hrm_rolesOrderByWithRelationInput
    > = ["name", "is_builtin", "created_at", "updated_at"];
    const validDirections: Array<"asc" | "desc"> = ["asc", "desc"];
    if (
      validFields.includes(
        field as keyof Prisma.erp_hrm_rolesOrderByWithRelationInput,
      ) &&
      validDirections.includes(direction as "asc" | "desc")
    ) {
      orderBy = {
        [field]: direction,
      } as Prisma.erp_hrm_rolesOrderByWithRelationInput;
    }
  }
  // Execute count query first
  const total = await MyGlobal.prisma.erp_hrm_roles.count({
    where: whereInput,
  });
  // Execute data query
  const data = await MyGlobal.prisma.erp_hrm_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    ...ErpHrmRoleAtSummaryTransformer.select(),
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmRoleAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
