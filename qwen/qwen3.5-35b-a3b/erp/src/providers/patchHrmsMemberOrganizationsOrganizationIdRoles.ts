import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationRoleAtSummaryTransformer } from "../transformers/HrmsOrganizationRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganizationRole.IRequest;
}): Promise<IPageIHrmsOrganizationRole.ISummary> {
  // Validate organization exists and is not deleted
  const organization =
    await MyGlobal.prisma.hrms_organizations.findUniqueOrThrow({
      where: { id: props.organizationId, deleted_at: null },
    });
  // Build where clause with filters
  const whereInput: Prisma.hrms_organization_rolesWhereInput = {
    organization_id: props.organizationId,
    ...(props.body.search !== undefined
      ? {
          name: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        }
      : {}),
    ...(props.body.is_builtin !== undefined && props.body.is_builtin !== null
      ? { is_builtin: props.body.is_builtin }
      : {}),
  };
  // Build order by
  const orderByInput: Prisma.hrms_organization_rolesOrderByWithRelationInput =
    props.body.sort === "name" || props.body.sort === undefined
      ? { name: "asc" as const }
      : props.body.sort === "-name"
        ? { name: "desc" as const }
        : props.body.sort === "created_at"
          ? { created_at: "asc" as const }
          : { created_at: "desc" as const };
  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query roles with member count
  const data = await MyGlobal.prisma.hrms_organization_roles.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmsOrganizationRoleAtSummaryTransformer.select(),
  });
  // Calculate total count
  const total = await MyGlobal.prisma.hrms_organization_roles.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmsOrganizationRoleAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsOrganizationRole.ISummary;
}
