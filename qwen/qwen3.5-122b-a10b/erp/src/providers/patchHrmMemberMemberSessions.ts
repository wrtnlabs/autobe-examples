import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberSessionAtSummaryTransformer } from "../transformers/HrmMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberMemberSessions(props: {
  member: MemberPayload;
  body: IHrmMemberSession.IRequest;
}): Promise<IPageIHrmMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_member_sessionsWhereInput = {
    hrm_member_id: props.member.id,
    ...(props.body.date_range && {
      created_at: {
        ...(props.body.date_range.start && {
          gte: new Date(props.body.date_range.start),
        }),
        ...(props.body.date_range.end && {
          lte: new Date(props.body.date_range.end),
        }),
      },
    }),
    ...(props.body.is_active !== undefined && {
      expired_at: props.body.is_active
        ? { gt: new Date() }
        : { lte: new Date() },
    }),
    ...(props.body.ip_address && {
      ip: props.body.ip_address,
    }),
  } satisfies Prisma.hrm_member_sessionsWhereInput;
  const orderByInput: Prisma.hrm_member_sessionsOrderByWithRelationInput =
    props.body.sort_by === "id"
      ? { id: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" };
  const records = await MyGlobal.prisma.hrm_member_sessions.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...HrmMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_member_sessions.count({
    where: whereInput,
  });
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };
  const data = await ArrayUtil.asyncMap(
    records,
    HrmMemberSessionAtSummaryTransformer.transform,
  );
  const result: IPageIHrmMemberSession.ISummary = {
    pagination: pagination,
    data: data,
  };
  return result;
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
// import { IHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberSession";
// import { IPageIHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberSession";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberMemberSessions(props: {
//   member: MemberPayload;
//   body: IHrmMemberSession.IRequest;
// }): Promise<IPageIHrmMemberSession.ISummary> {
//   const records = await MyGlobal.prisma.hrm_member_sessions.findMany({
//     ...HrmMemberSessionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmMemberSessionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------