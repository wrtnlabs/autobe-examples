import { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorUsers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IPageIEcommerceMallUser.IRequest;
}): Promise<IPageIEcommerceMallUser.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const validatedLimit: number = limit < 1 ? 1 : limit > 100 ? 100 : limit;
  const validatedPage: number = page < 1 ? 1 : page;
  const skip: number = (validatedPage - 1) * validatedLimit;
  const baseMemberWhere: Prisma.ecommerce_mall_membersWhereInput = {
    deleted_at: null,
  };
  const baseSellerWhere: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: null,
  };
  const baseAdminWhere: Prisma.ecommerce_mall_administratorsWhereInput = {
    deleted_at: null,
  };
  const sortBy: "created_at" | "updated_at" | "display_name" = "created_at";
  const sortOrder: "asc" | "desc" = "desc";
  let customerUsers: Array<{
    id: string & tags.Format<"uuid">;
    email: string;
    display_name: string | null;
    type: "customer";
    approval_status: null;
    grade: null;
    is_banned: boolean | null;
    is_suspended: null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = [];
  const members = await MyGlobal.prisma.ecommerce_mall_members.findMany({
    where: baseMemberWhere,
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
    },
    skip: skip,
    take: validatedLimit,
    orderBy: {
      [sortBy]: sortOrder,
    } satisfies Prisma.ecommerce_mall_membersOrderByWithRelationInput,
  });
  customerUsers = members.map((m) => ({
    id: m.id,
    email: m.email,
    display_name: m.display_name,
    type: "customer",
    approval_status: null,
    grade: null,
    is_banned: null,
    is_suspended: null,
    created_at: toISOStringSafe(m.created_at),
    updated_at: toISOStringSafe(m.updated_at),
  }));
  let sellerUsers: Array<{
    id: string & tags.Format<"uuid">;
    email: string;
    display_name: string;
    type: "seller";
    approval_status: string;
    grade: null;
    is_banned: null;
    is_suspended: boolean;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = [];
  const sellers = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
    where: baseSellerWhere,
    select: {
      id: true,
      email: true,
      display_name: true,
      approval_status: true,
      is_suspended: true,
      created_at: true,
      updated_at: true,
    },
    skip: skip,
    take: validatedLimit,
    orderBy: {
      [sortBy]: sortOrder,
    } satisfies Prisma.ecommerce_mall_sellersOrderByWithRelationInput,
  });
  sellerUsers = sellers.map((s) => ({
    id: s.id,
    email: s.email,
    display_name: s.display_name,
    type: "seller",
    approval_status: s.approval_status,
    grade: null,
    is_banned: null,
    is_suspended: s.is_suspended,
    created_at: toISOStringSafe(s.created_at),
    updated_at: toISOStringSafe(s.updated_at),
  }));
  let adminUsers: Array<{
    id: string & tags.Format<"uuid">;
    email: string;
    display_name: string;
    type: "administrator";
    approval_status: null;
    grade: string;
    is_banned: boolean;
    is_suspended: null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = [];
  const admins = await MyGlobal.prisma.ecommerce_mall_administrators.findMany({
    where: baseAdminWhere,
    select: {
      id: true,
      email: true,
      display_name: true,
      grade: true,
      is_banned: true,
      created_at: true,
      updated_at: true,
    },
    skip: skip,
    take: validatedLimit,
    orderBy: {
      [sortBy]: sortOrder,
    } satisfies Prisma.ecommerce_mall_administratorsOrderByWithRelationInput,
  });
  adminUsers = admins.map((a) => ({
    id: a.id,
    email: a.email,
    display_name: a.display_name,
    type: "administrator",
    approval_status: null,
    grade: a.grade,
    is_banned: a.is_banned,
    is_suspended: null,
    created_at: toISOStringSafe(a.created_at),
    updated_at: toISOStringSafe(a.updated_at),
  }));
  const allUsers: Array<{
    id: string & tags.Format<"uuid">;
    email: string;
    display_name: string | null;
    type: "customer" | "seller" | "administrator";
    approval_status: string | null;
    grade: string | null;
    is_banned: boolean | null;
    is_suspended: boolean | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = [...customerUsers, ...sellerUsers, ...adminUsers];
  let total: number = 0;
  const [memberCount, sellerCount, adminCount] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_members.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.ecommerce_mall_administrators.count({
      where: { deleted_at: null },
    }),
  ]);
  total = memberCount + sellerCount + adminCount;
  const data: Array<{
    id: string & tags.Format<"uuid">;
    email: string;
    type: "customer" | "seller" | "administrator";
    display_name: string | null;
    approval_status: string | null;
    grade: string | null;
    is_banned: boolean | null;
    is_suspended: boolean | null;
    created_at: string & tags.Format<"date-time">;
    updated_at: string & tags.Format<"date-time">;
  }> = allUsers.slice(0, validatedLimit).map((user) => {
    const [localPart, domain] = user.email.split("@");
    const maskedLocal =
      localPart.slice(0, 2) + "*".repeat(Math.max(0, localPart.length - 2));
    return {
      id: user.id,
      email: `${maskedLocal}@${domain}`,
      type: user.type,
      display_name: user.display_name,
      approval_status: user.approval_status,
      grade: user.grade,
      is_banned: user.is_banned,
      is_suspended: user.is_suspended,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  });
  return {
    data: data,
    pagination: {
      current: validatedPage,
      limit: validatedLimit,
      records: total,
      pages: Math.ceil(total / validatedLimit),
    },
  } satisfies IPageIEcommerceMallUser.ISummary;
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
// import { IPageIEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallUser";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallUser";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorUsers(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IPageIEcommerceMallUser.IRequest;
// }): Promise<IPageIEcommerceMallUser.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------