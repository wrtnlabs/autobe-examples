import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallMemberEmailVerificationAtSummaryTransformer } from "../transformers/EcommerceMallMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IEcommerceMallMemberEmailVerification.IRequest;
}): Promise<IPageIEcommerceMallMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedPage = page < 1 ? 1 : page;
  const validatedLimit = limit > 100 ? 100 : limit < 1 ? 1 : limit;
  const sort = props.body.sort ?? "created_at";
  const where: Prisma.ecommerce_mall_member_email_verificationsWhereInput = {};
  if (props.body.deleted_at === null) {
    where.deleted_at = null;
  } else if (props.body.deleted_at !== undefined) {
    where.deleted_at = { not: null };
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.email) {
    where.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.ecommerce_mall_member_id) {
    where.ecommerce_mall_member_id = props.body.ecommerce_mall_member_id;
  }
  if (props.body.created_at?.gte || props.body.created_at?.lte) {
    where.created_at = {};
    if (props.body.created_at.gte) {
      where.created_at!.gte = new Date(props.body.created_at.gte);
    }
    if (props.body.created_at.lte) {
      where.created_at!.lte = new Date(props.body.created_at.lte);
    }
  }
  if (props.body.expired_at?.gte || props.body.expired_at?.lte) {
    where.expired_at = {};
    if (props.body.expired_at.gte) {
      where.expired_at!.gte = new Date(props.body.expired_at.gte);
    }
    if (props.body.expired_at.lte) {
      where.expired_at!.lte = new Date(props.body.expired_at.lte);
    }
  }
  if (props.body.status === undefined) {
    where.status = { not: "archived" };
  }
  const orderBy = [
    {
      [sort]: "desc",
    },
  ] satisfies Prisma.ecommerce_mall_member_email_verificationsOrderByWithRelationInput[];
  const skip = (validatedPage - 1) * validatedLimit;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_member_email_verifications.findMany({
      where,
      skip,
      take: validatedLimit,
      orderBy,
      ...EcommerceMallMemberEmailVerificationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_member_email_verifications.count({
      where,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallMemberEmailVerificationAtSummaryTransformer.transform,
  );
  const pagination: IPage.IPagination = {
    current: validatedPage,
    limit: validatedLimit,
    records: total,
    pages: total === 0 ? 0 : Math.ceil(total / validatedLimit),
  } satisfies IPage.IPagination;
  return {
    pagination,
    data,
  } satisfies IPageIEcommerceMallMemberEmailVerification.ISummary;
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
// import { IEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMemberEmailVerification";
// import { IPageIEcommerceMallMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IEcommerceMallMemberEmailVerification.IRequest;
// }): Promise<IPageIEcommerceMallMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_member_email_verifications.findMany({
//     ...EcommerceMallMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------