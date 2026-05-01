import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberPasswordResetAtSummaryTransformer } from "../transformers/CommunityHubMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMembersUsernamePasswordResets(props: {
  username: string;
  body: ICommunityHubMemberPasswordReset.IRequest;
}): Promise<IPageICommunityHubMemberPasswordReset.ISummary> {
  const member = await MyGlobal.prisma.community_hub_members.findUniqueOrThrow({
    where: { username: props.username },
    select: { id: true },
  });
  const where: Prisma.community_hub_member_password_resetsWhereInput = {
    community_hub_member_id: member.id,
  };
  if (
    props.body.created_from !== undefined ||
    props.body.created_to !== undefined
  ) {
    where.created_at = {
      ...(props.body.created_from !== undefined
        ? { gte: props.body.created_from }
        : {}),
      ...(props.body.created_to !== undefined
        ? { lte: props.body.created_to }
        : {}),
    };
  }
  if (props.body.used !== undefined) {
    where.used_at = props.body.used ? { not: null } : null;
  }
  if (props.body.expired !== undefined) {
    const now: string = new Date().toISOString();
    where.expired_at = props.body.expired ? { lt: now } : { gte: now };
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.community_hub_member_password_resets.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityHubMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.community_hub_member_password_resets.count({
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
      data,
      CommunityHubMemberPasswordResetAtSummaryTransformer.transform,
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
// import { ICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberPasswordReset";
// import { IPageICommunityHubMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMembersUsernamePasswordResets(props: {
//   username: string;
//   body: ICommunityHubMemberPasswordReset.IRequest;
// }): Promise<IPageICommunityHubMemberPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_member_password_resets.findMany({
//     ...CommunityHubMemberPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubMemberPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------