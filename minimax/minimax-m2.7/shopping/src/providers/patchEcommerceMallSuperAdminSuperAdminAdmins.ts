import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminSuperAdminAdmins(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallAdmin.IRequest;
}): Promise<IPageIEcommerceMallAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at:
      props.body.status === "active"
        ? null
        : props.body.status === "deleted"
          ? { not: null }
          : undefined,
    ...(props.body.search && {
      OR: [
        { email: { contains: props.body.search } },
        { name: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.ecommerce_mall_adminsWhereInput;
  const superAdmins =
    await MyGlobal.prisma.ecommerce_mall_super_admins.findMany({
      where: { deleted_at: null },
      select: { id: true },
    });
  const superAdminIds = new Set(superAdmins.map((s) => s.id));
  let superAdminFilter:
    | {
        id: {
          in: string[];
        };
      }
    | {
        id: {
          notIn: string[];
        };
      }
    | undefined;
  if (props.body.superAdmin === true) {
    superAdminFilter = { id: { in: Array.from(superAdminIds) } };
  } else if (props.body.superAdmin === false) {
    superAdminFilter = { id: { notIn: Array.from(superAdminIds) } };
  }
  const finalWhere: Prisma.ecommerce_mall_adminsWhereInput = {
    ...whereInput,
    ...superAdminFilter,
  };
  const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
    where: finalWhere,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_admins.count({
    where: finalWhere,
  });
  return {
    pagination: {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: [],
    },
    data: records.map((record) => ({
      id: record.id,
      email: record.email,
      name: record.name,
      created_at: record.created_at.toISOString(),
      updated_at: record.updated_at.toISOString(),
      deleted_at: record.deleted_at?.toISOString() ?? null,
      is_super_admin: superAdminIds.has(record.id),
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
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
// import { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdminSuperAdminAdmins(props: {
//   superAdmin: SuperadminPayload;
//   body: IEcommerceMallAdmin.IRequest;
// }): Promise<IPageIEcommerceMallAdmin.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_admins.findMany({
//     ...EcommerceMallAdminAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallAdminAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------