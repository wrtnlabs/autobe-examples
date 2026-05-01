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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmDepartmentAtSummaryTransformer } from "../transformers/ErpHrmDepartmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberDepartments(props: {
  member: MemberPayload;
  body: IErpHrmDepartment.IRequest;
}): Promise<IPageIErpHrmDepartment.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId = session.erp_hrm_organization_id;
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.erp_hrm_departmentsWhereInput = {
    erp_hrm_organization_id: organizationId,
    deleted_at: null,
  };
  if (props.body.search && props.body.search.trim().length > 0) {
    const mode: Prisma.QueryMode = "insensitive";
    whereInput.name = {
      contains: props.body.search,
      mode,
    };
  }
  if (props.body.parent_id !== undefined) {
    whereInput.parent_id = props.body.parent_id;
  }
  const orderByInput = parseDepartmentOrderBy(props.body.sort);
  const records = await MyGlobal.prisma.erp_hrm_departments.findMany({
    where: whereInput,
    ...ErpHrmDepartmentAtSummaryTransformer.select(),
    orderBy: orderByInput,
    skip,
    take: limit,
  });
  const total = await MyGlobal.prisma.erp_hrm_departments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ErpHrmDepartmentAtSummaryTransformer.transformAll(records),
  };
}
function parseDepartmentOrderBy(
  sort: string | undefined,
):
  | Prisma.erp_hrm_departmentsOrderByWithRelationInput
  | Prisma.erp_hrm_departmentsOrderByWithRelationInput[] {
  const defaultOrder: Prisma.erp_hrm_departmentsOrderByWithRelationInput = {
    name: "asc",
  };
  if (!sort || sort.trim().length === 0) {
    return defaultOrder;
  }
  const parts = sort
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (parts.length === 0) {
    return defaultOrder;
  }
  const orders: Prisma.erp_hrm_departmentsOrderByWithRelationInput[] = [];
  for (const part of parts) {
    const segments = part.split(/\s+/);
    const column = segments[0];
    const direction = segments[1]?.toLowerCase() === "desc" ? "desc" : "asc";
    switch (column) {
      case "name":
        orders.push({ name: direction });
        break;
      case "created_at":
        orders.push({ created_at: direction });
        break;
      case "updated_at":
        orders.push({ updated_at: direction });
        break;
      default:
        orders.push({ name: direction });
        break;
    }
  }
  if (orders.length === 1) {
    return orders[0];
  }
  return orders;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IPageIErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmDepartment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberDepartments(props: {
//   member: MemberPayload;
//   body: IErpHrmDepartment.IRequest;
// }): Promise<IPageIErpHrmDepartment.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_departments.findMany({
//     ...ErpHrmDepartmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ErpHrmDepartmentAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------