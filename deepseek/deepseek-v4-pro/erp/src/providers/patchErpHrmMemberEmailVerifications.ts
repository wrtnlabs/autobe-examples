import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberEmailVerificationAtSummaryTransformer } from "../transformers/ErpHrmMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IErpHrmMemberEmailVerification.IRequest;
}): Promise<IPageIErpHrmMemberEmailVerification.ISummary> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (!organizationId) {
    throw new HttpException("No organization selected", 400);
  }
  const now = toISOStringSafe(new Date());
  const limit = props.body.limit ?? 20;
  const sortField = props.body.sort_field ?? "created_at";
  const sortDir = props.body.sort_direction ?? "desc";
  const whereInput: Prisma.erp_hrm_member_email_verificationsWhereInput = {
    member: {
      deleted_at: null,
      erp_hrm_employees: {
        some: {
          erp_hrm_organization_id: organizationId,
          deleted_at: null,
        },
      },
    } as any,
  };
  if (props.body.search) {
    whereInput.email = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.member_id) {
    whereInput.erp_hrm_member_id = props.body.member_id;
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    whereInput.created_at = {};
    if (props.body.created_at_from) {
      whereInput.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      whereInput.created_at.lte = props.body.created_at_to;
    }
  }
  if (props.body.status === "pending") {
    whereInput.verified_at = null;
    whereInput.expires_at = { gt: now };
  } else if (props.body.status === "verified") {
    whereInput.verified_at = { not: null };
  } else if (props.body.status === "expired") {
    whereInput.verified_at = null;
    whereInput.expires_at = { lte: now };
  }
  let skip: number | undefined;
  let cursor:
    | Prisma.erp_hrm_member_email_verificationsWhereUniqueInput
    | undefined;
  let currentPage: number;
  if (props.body.next) {
    const decoded = JSON.parse(
      Buffer.from(props.body.next, "base64").toString(),
    ) as {
      id: string;
    };
    cursor = { id: decoded.id };
    currentPage = 0;
  } else {
    currentPage = props.body.page ?? 1;
    skip = (currentPage - 1) * limit;
  }
  const findManyArgs: Prisma.erp_hrm_member_email_verificationsFindManyArgs = {
    where: whereInput,
    orderBy: { [sortField]: sortDir },
    take: limit,
    ...ErpHrmMemberEmailVerificationAtSummaryTransformer.select(),
  };
  if (cursor) {
    findManyArgs.cursor = cursor;
    findManyArgs.skip = 1;
  } else if (skip !== undefined) {
    findManyArgs.skip = skip;
  }
  const records =
    await MyGlobal.prisma.erp_hrm_member_email_verifications.findMany(
      findManyArgs,
    );
  const total = await MyGlobal.prisma.erp_hrm_member_email_verifications.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: currentPage,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records as any,
      ErpHrmMemberEmailVerificationAtSummaryTransformer.transform,
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
// import { IErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberEmailVerification";
// import { IPageIErpHrmMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IErpHrmMemberEmailVerification.IRequest;
// }): Promise<IPageIErpHrmMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_member_email_verifications.findMany({
//     ...ErpHrmMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------