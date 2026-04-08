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
import { EcommerceMallMemberAtSummaryTransformer } from "../transformers/EcommerceMallMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMembers(props: {
  body: IEcommerceMallMember.IRequest;
}): Promise<IPageIEcommerceMallMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const sortField = props.body.sort_field ?? "created_at";
  const sortOrder = props.body.sort_order ?? "DESC";
  const whereCondition: Prisma.ecommerce_mall_membersWhereInput = {};
  if (props.body.email !== undefined) {
    whereCondition.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (
    props.body.display_name !== undefined &&
    props.body.display_name !== null
  ) {
    whereCondition.display_name = {
      contains: props.body.display_name,
      mode: "insensitive",
    };
  }
  if (
    props.body.phone_number !== undefined &&
    props.body.phone_number !== null
  ) {
    whereCondition.phone_number = {
      contains: props.body.phone_number,
      mode: "insensitive",
    };
  }
  let gte: Date | undefined;
  if (props.body.from_date !== undefined) {
    gte = new Date(props.body.from_date);
  }
  if (props.body.to_date !== undefined) {
    if (gte) {
      whereCondition.created_at = {
        gte,
        lte: new Date(props.body.to_date),
      };
    } else {
      whereCondition.created_at = {
        lte: new Date(props.body.to_date),
      };
    }
  } else if (gte) {
    whereCondition.created_at = {
      gte,
    };
  }
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_members.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortOrder,
      },
      ...EcommerceMallMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_members.count({
      where: whereCondition,
    }),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallMemberAtSummaryTransformer.transform,
    ),
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
// export async function patchEcommerceMallMembers(props: {
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