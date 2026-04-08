import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmMemberAtSummaryTransformer } from "../transformers/HrmMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMembers(props: {
  body: IHrmMember.IRequest;
}): Promise<IPageIHrmMember.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.hrm_membersWhereInput = {
    ...(props.body.email !== undefined && {
      email: {
        contains: props.body.email,
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
    ...(props.body.include_deleted === true
      ? {}
      : {
          deleted_at: null,
        }),
  } satisfies Prisma.hrm_membersWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_members.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmMemberAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_members.count({ where: whereInput }),
  ]);
  const pages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmMember.ISummary;
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
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IPageIHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMembers(props: {
//   body: IHrmMember.IRequest;
// }): Promise<IPageIHrmMember.ISummary> {
//   const records = await MyGlobal.prisma.hrm_members.findMany({
//     ...HrmMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------