import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceMallMemberAtSummaryTransformer } from "../transformers/EcommerceMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdministratorCustomers(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceMallMember.IRequest;
}): Promise<IPageIEcommerceMallMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const whereInput = {
    deleted_at: null,
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" as const },
    }),
    ...(props.body.display_name !== undefined &&
      props.body.display_name !== null && {
        display_name: {
          contains: props.body.display_name,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.phone_number !== undefined &&
      props.body.phone_number !== null && {
        phone_number: {
          contains: props.body.phone_number,
          mode: "insensitive" as const,
        },
      }),
    ...(props.body.from_date && { created_at: { gte: props.body.from_date } }),
    ...(props.body.to_date && { created_at: { lte: props.body.to_date } }),
  } satisfies Prisma.ecommerce_mall_membersWhereInput;
  const orderByInput = (
    props.body.sort_field === "email"
      ? { email: props.body.sort_order === "ASC" ? "asc" : ("desc" as const) }
      : props.body.sort_field === "display_name"
        ? {
            display_name:
              props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
          }
        : props.body.sort_field === "phone_number"
          ? {
              phone_number:
                props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
            }
          : props.body.sort_field === "updated_at"
            ? {
                updated_at:
                  props.body.sort_order === "ASC" ? "asc" : ("desc" as const),
              }
            : {
                created_at:
                  props.body.sort_order === "ASC" ? "desc" : ("asc" as const),
              }
  ) satisfies Prisma.ecommerce_mall_membersOrderByWithRelationInput;
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_members.count({ where: whereInput }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallMemberAtSummaryTransformer.transform,
    ),
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
// import { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
// import { IPageIEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSuperAdministratorCustomers(props: {
//   superAdministrator: SuperadministratorPayload;
//   body: IEcommerceMallMember.IRequest;
// }): Promise<IPageIEcommerceMallMember.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_members.findMany({
//     ...EcommerceMallMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------