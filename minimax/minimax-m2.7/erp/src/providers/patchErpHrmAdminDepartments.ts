import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmDepartmentAtSummaryTransformer } from "../transformers/ErpHrmDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminDepartments(props: {
  admin: AdminPayload;
  body: IErpHrmDepartment.IRequest;
}): Promise<IPageIErpHrmDepartment.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereInput = {
    // Filter by deleted_at based on includeInactive flag
    ...(props.body.includeInactive === true ? {} : { deleted_at: null }),
    // Filter by parent department ID
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    // Filter by name - exact match takes precedence over search
    ...(props.body.name !== undefined
      ? { name: { equals: props.body.name, mode: "insensitive" as const } }
      : props.body.search !== undefined
        ? {
            name: { contains: props.body.search, mode: "insensitive" as const },
          }
        : {}),
  } satisfies Prisma.erp_hrm_departmentsWhereInput;
  // Determine sort field and direction
  const sortField = props.body.sort ?? "name";
  const sortDirection =
    props.body.order === "desc" ? ("desc" as const) : ("asc" as const);
  // Build orderBy clause
  const orderByInput = {
    [sortField]: sortDirection,
  } satisfies Prisma.erp_hrm_departmentsOrderByWithRelationInput;
  // Execute queries - sequential (not parallel) for findMany and count
  const data = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...ErpHrmDepartmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_departments.count({
    where: whereInput,
  });
  // Transform results using the transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ErpHrmDepartmentAtSummaryTransformer.transform,
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
