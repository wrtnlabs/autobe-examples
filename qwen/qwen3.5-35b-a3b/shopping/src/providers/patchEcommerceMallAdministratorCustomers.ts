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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallMemberAtSummaryTransformer } from "../transformers/EcommerceMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IEcommerceMallMember.IRequest;
}): Promise<IPageIEcommerceMallMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const skip = (page - 1) * validatedLimit;
  const filter: Prisma.ecommerce_mall_membersWhereInput = {
    deleted_at: null,
    ...(props.body.email !== undefined && {
      email: { contains: props.body.email },
    }),
    ...(props.body.display_name !== undefined &&
      props.body.display_name !== null && {
        display_name: { contains: props.body.display_name },
      }),
    ...(props.body.phone_number !== undefined &&
      props.body.phone_number !== null && {
        phone_number: { contains: props.body.phone_number },
      }),
    ...(props.body.from_date !== undefined && {
      created_at: { gte: new Date(props.body.from_date) },
    }),
    ...(props.body.to_date !== undefined && {
      created_at: {
        lte: new Date(props.body.to_date + "T23:59:59.999"),
      },
    }),
  };
  const sortField = props.body.sort_field ?? "created_at";
  const sortOrder = props.body.sort_order ?? "DESC";
  const validFields: readonly string[] = [
    "email",
    "display_name",
    "phone_number",
    "created_at",
    "updated_at",
  ];
  const orderByInput: Prisma.ecommerce_mall_membersOrderByWithRelationInput =
    sortField !== undefined && validFields.includes(sortField)
      ? {
          [sortField]: sortOrder.toLowerCase() === "asc" ? "asc" : "desc",
        }
      : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_members.findMany({
      where: filter,
      orderBy: orderByInput,
      skip,
      take: validatedLimit,
      ...EcommerceMallMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_members.count({
      where: filter,
    }),
  ]);
  const pagination: IPage.IPagination = {
    current: page,
    limit: validatedLimit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / validatedLimit),
  };
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallMemberAtSummaryTransformer.transform,
  );
  return {
    pagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallMember.ISummary;
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
// export async function patchEcommerceMallAdministratorCustomers(props: {
//   administrator: AdministratorPayload;
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