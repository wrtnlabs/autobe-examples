import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMembers(props: {
  body: IErpHrmMember.IRequest;
}): Promise<IPageIErpHrmMember.ISummary> {
  const body = props.body;
  const limit = Math.min(Math.max(body.limit ?? 20, 1), 100);
  const page = body.page ?? 1;
  const skip = (page - 1) * limit;
  // Build member-level filters
  const memberWhere: Prisma.erp_hrm_membersWhereInput = {
    deleted_at: null,
  };
  if (body.search && body.search.trim()) {
    memberWhere.display_name = {
      contains: body.search.trim(),
      mode: "insensitive",
    };
  }
  if (body.email) {
    const email = body.email.trim();
    if (email.includes("@")) {
      memberWhere.email = { equals: email, mode: "insensitive" };
    } else {
      memberWhere.email = { startsWith: email, mode: "insensitive" };
    }
  }
  // Build employee where clause combining member and employee filters
  const where: Prisma.erp_hrm_employeesWhereInput = {
    deleted_at: null,
    member: memberWhere,
  };
  if (body.status) {
    where.status = body.status;
  }
  if (body.employment_type) {
    where.employment_type = body.employment_type;
  }
  if (body.role_id) {
    where.erp_hrm_role_id = body.role_id;
  }
  if (body.department_id) {
    where.erp_hrm_department_id = body.department_id;
  }
  // Parse sort specification
  let orderBy: Prisma.erp_hrm_employeesOrderByWithRelationInput = {
    member: { display_name: "asc" },
  };
  if (body.sort) {
    const lastColon = body.sort.lastIndexOf(":");
    const field = lastColon > 0 ? body.sort.substring(0, lastColon) : body.sort;
    const direction =
      lastColon > 0 ? body.sort.substring(lastColon + 1) : "asc";
    const dir = direction === "desc" ? ("desc" as const) : ("asc" as const);
    switch (field) {
      case "display_name":
        orderBy = { member: { display_name: dir } };
        break;
      case "email":
        orderBy = { member: { email: dir } };
        break;
      case "created_at":
        orderBy = { created_at: dir };
        break;
      case "status":
        orderBy = { status: dir };
        break;
    }
  }
  const data = await MyGlobal.prisma.erp_hrm_employees.findMany({
    where,
    select: {
      id: true,
      position: true,
      employment_type: true,
      status: true,
      member: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_image: true,
          phone_number: true,
        },
      },
      role: {
        select: { name: true },
      },
      department: {
        select: { name: true },
      },
    },
    skip,
    take: limit,
    orderBy,
  });
  const total = await MyGlobal.prisma.erp_hrm_employees.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((r) => ({
      id: r.member.id,
      email: r.member.email,
      display_name: r.member.display_name,
      avatar_image: r.member.avatar_image ?? null,
      phone_number: r.member.phone_number ?? null,
      employee_id: r.id,
      position: r.position ?? "",
      employment_type: r.employment_type,
      status: r.status,
      role_name: r.role.name,
      department_name: r.department?.name ?? null,
    })),
  };
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IPageIErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMembers(props: {
//   body: IErpHrmMember.IRequest;
// }): Promise<IPageIErpHrmMember.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_members.findMany({
//     ...ErpHrmMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------