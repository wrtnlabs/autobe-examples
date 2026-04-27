import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformMemberPasswordResetAtSummaryTransformer } from "../transformers/CommunityPlatformMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPasswordResets(props: {
  member: MemberPayload;
  body: ICommunityPlatformMemberPasswordReset.IRequest;
}): Promise<IPageICommunityPlatformMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.community_platform_member_password_resetsWhereInput = {
    community_platform_member_id: props.member.id,
  };
  if (props.body.memberId !== undefined) {
    where.community_platform_member_id = props.body.memberId;
  }
  if (props.body.isUsed !== undefined) {
    where.used_at = props.body.isUsed ? { not: null } : null;
  }
  if (
    props.body.startCreatedAt !== undefined &&
    props.body.endCreatedAt !== undefined
  ) {
    where.created_at = {
      gte: props.body.startCreatedAt,
      lte: props.body.endCreatedAt,
    };
  } else if (props.body.startCreatedAt !== undefined) {
    where.created_at = {
      gte: props.body.startCreatedAt,
    };
  } else if (props.body.endCreatedAt !== undefined) {
    where.created_at = {
      lte: props.body.endCreatedAt,
    };
  }
  const records =
    await MyGlobal.prisma.community_platform_member_password_resets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_platform_member_password_resets.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformMemberPasswordResetAtSummaryTransformer.transform,
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
// import { ICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberPasswordReset";
// import { IPageICommunityPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberPasswordResets(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformMemberPasswordReset.IRequest;
// }): Promise<IPageICommunityPlatformMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_member_password_resets.findMany({
//     ...CommunityPlatformMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------