import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubMemberEmailVerificationAtSummaryTransformer } from "../transformers/CommunityHubMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubMembersUsernameEmailVerifications(props: {
  username: string;
  body: ICommunityHubMemberEmailVerification.IRequest;
}): Promise<IPageICommunityHubMemberEmailVerification.ISummary> {
  const member = await MyGlobal.prisma.community_hub_members.findUniqueOrThrow({
    where: { username: props.username },
    select: { id: true },
  });
  const now = new Date();
  const whereInput = {
    community_hub_member_id: member.id,
    ...(props.body.status === "valid" && { expired_at: { gt: now } }),
    ...(props.body.status === "expired" && { expired_at: { lte: now } }),
    ...((props.body.created_from !== undefined ||
      props.body.created_to !== undefined) && {
      created_at: {
        ...(props.body.created_from !== undefined && {
          gte: new Date(props.body.created_from),
        }),
        ...(props.body.created_to !== undefined && {
          lte: new Date(props.body.created_to),
        }),
      },
    }),
  } satisfies Prisma.community_hub_member_email_verificationsWhereInput;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.community_hub_member_email_verifications.findMany({
      where: whereInput,
      ...CommunityHubMemberEmailVerificationAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.community_hub_member_email_verifications.count({
      where: whereInput,
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
      CommunityHubMemberEmailVerificationAtSummaryTransformer.transform,
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
// import { ICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMemberEmailVerification";
// import { IPageICommunityHubMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubMembersUsernameEmailVerifications(props: {
//   username: string;
//   body: ICommunityHubMemberEmailVerification.IRequest;
// }): Promise<IPageICommunityHubMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_member_email_verifications.findMany({
//     ...CommunityHubMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------