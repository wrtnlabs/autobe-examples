import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmMemberMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmMemberEmailVerification.IRequest;
}): Promise<IPageIHrmMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_member_email_verificationsWhereInput = {
    deleted_at: null,
    ...(props.body.member_id && {
      hrm_member_id: props.body.member_id,
    }),
    ...(props.body.email && {
      email: {
        contains: props.body.email,
        mode: "insensitive",
      },
    }),
    ...(props.body.status && {
      AND:
        props.body.status === "pending"
          ? [{ used_at: null }, { expires_at: { gt: new Date() } }]
          : props.body.status === "used"
            ? { used_at: { not: null } }
            : [{ expires_at: { lte: new Date() } }, { used_at: null }],
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
    ...(props.body.expires_at_from && {
      expires_at: { gte: new Date(props.body.expires_at_from) },
    }),
    ...(props.body.expires_at_to && {
      expires_at: { lte: new Date(props.body.expires_at_to) },
    }),
  } satisfies Prisma.hrm_member_email_verificationsWhereInput;
  const records = await MyGlobal.prisma.hrm_member_email_verifications.findMany(
    {
      where: whereInput,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      ...HrmMemberEmailVerificationAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_member_email_verifications.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmMemberEmailVerification.ISummary;
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
// import { IHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMemberEmailVerification";
// import { IPageIHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmMemberMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IHrmMemberEmailVerification.IRequest;
// }): Promise<IPageIHrmMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.hrm_member_email_verifications.findMany({
//     ...HrmMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, HrmMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------