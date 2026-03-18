import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberOrganizationsOrganizationIdDepartments(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsDepartment.IRequest;
}): Promise<IPageIHrmsDepartment.ISummary> {
  // Parse pagination parameters
  const page =
    props.body.page !== undefined ? parseInt(props.body.page, 10) : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate organization exists
  const organization = await MyGlobal.prisma.hrms_organizations.findUnique({
    where: { id: props.organizationId },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Build WHERE clause
  const whereInput: Prisma.hrms_departmentsWhereInput = {
    organization_id: props.organizationId,
  };
  // Include/exclude soft-deleted based on flag
  if (props.body.include_deleted === false) {
    whereInput.deleted_at = null;
  }
  // Validate and apply parent_id filter if provided
  if (props.body.parent_id !== undefined) {
    const parentDepartment = await MyGlobal.prisma.hrms_departments.findUnique({
      where: { id: props.body.parent_id },
      select: { organization_id: true, deleted_at: true },
    });
    if (parentDepartment === null) {
      throw new HttpException("Parent department not found", 404);
    }
    if (parentDepartment.organization_id !== props.organizationId) {
      throw new HttpException(
        "Parent department does not belong to organization",
        400,
      );
    }
    whereInput.parent_id = props.body.parent_id;
  }
  // Apply name search filter using GIN index for trigram similarity
  if (props.body.search !== undefined) {
    whereInput.name = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter<string>;
  }
  // Build ORDER BY clause
  const orderByInput: Prisma.hrms_departmentsOrderByWithRelationInput =
    props.body.sort_by === "name"
      ? {
          name: props.body.sort_order === "asc" ? "asc" : "desc",
        }
      : props.body.sort_by === "created_at"
        ? {
            created_at: props.body.sort_order === "asc" ? "asc" : "desc",
          }
        : props.body.sort_by === "updated_at"
          ? {
              updated_at: props.body.sort_order === "asc" ? "asc" : "desc",
            }
          : ({
              created_at: "desc",
            } satisfies Prisma.hrms_departmentsOrderByWithRelationInput);
  // Fetch departments with parent relation
  const departments = await MyGlobal.prisma.hrms_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      description: true,
      parent_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization_id: true,
      parent: {
        select: {
          id: true,
          name: true,
          description: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          organization_id: true,
        },
      },
    },
  });
  // Get total count
  const total = await MyGlobal.prisma.hrms_departments.count({
    where: whereInput,
  });
  // Transform to ISummary format
  const data: IHrmsDepartment.ISummary[] = await ArrayUtil.asyncMap(
    departments,
    async (dept) => {
      const parentSummary: IHrmsDepartment.ISummary | null =
        dept.parent !== null
          ? ({
              id: dept.parent.id,
              name: dept.parent.name,
              description: dept.parent.description,
              parent: null,
              created_at: toISOStringSafe(dept.parent.created_at),
              updated_at: toISOStringSafe(dept.parent.updated_at),
              deleted_at:
                dept.parent.deleted_at !== null
                  ? toISOStringSafe(dept.parent.deleted_at)
                  : null,
              organization_id: dept.parent.organization_id,
            } satisfies IHrmsDepartment.ISummary)
          : null;
      return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        parent: parentSummary,
        created_at: toISOStringSafe(dept.created_at),
        updated_at: toISOStringSafe(dept.updated_at),
        deleted_at:
          dept.deleted_at !== null ? toISOStringSafe(dept.deleted_at) : null,
        organization_id: dept.organization_id,
      } satisfies IHrmsDepartment.ISummary;
    },
  );
  // Build pagination metadata
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data,
  } satisfies IPageIHrmsDepartment.ISummary;
}
