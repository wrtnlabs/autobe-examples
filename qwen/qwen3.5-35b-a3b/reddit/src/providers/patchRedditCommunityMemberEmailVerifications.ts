import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberEmailVerification";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberEmailVerificationAtSummaryTransformer } from "../transformers/RedditCommunityMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IRedditCommunityMemberEmailVerification.IRequest;
}): Promise<IPageIRedditCommunityMemberEmailVerification.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const sortBy: "created_at" | "updated_at" | "expires_at" =
    props.body.sort_by ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sort_order ?? "desc";
  const skip: number = (page - 1) * limit;
  const nowTimestamp: string & tags.Format<"date-time"> =
    new Date().toISOString();
  const whereClause: Prisma.reddit_community_member_email_verificationsWhereInput =
    {
      deleted_at: null,
      ...(props.body.reddit_community_member_id !== undefined
        ? { reddit_community_member_id: props.body.reddit_community_member_id }
        : {}),
      ...(props.body.token !== undefined ? { token: props.body.token } : {}),
      ...(props.body.status !== undefined
        ? {
            expires_at:
              props.body.status === "active"
                ? { gt: nowTimestamp }
                : { lte: nowTimestamp },
          }
        : {}),
      ...(props.body.created_at_start !== undefined
        ? { created_at: { gte: props.body.created_at_start } }
        : {}),
      ...(props.body.created_at_end !== undefined
        ? { created_at: { lte: props.body.created_at_end } }
        : {}),
      ...(props.body.updated_at_start !== undefined
        ? { updated_at: { gte: props.body.updated_at_start } }
        : {}),
      ...(props.body.updated_at_end !== undefined
        ? { updated_at: { lte: props.body.updated_at_end } }
        : {}),
      ...(props.body.expires_at_start !== undefined
        ? { expires_at: { gte: props.body.expires_at_start } }
        : {}),
      ...(props.body.expires_at_end !== undefined
        ? { expires_at: { lte: props.body.expires_at_end } }
        : {}),
    } satisfies Prisma.reddit_community_member_email_verificationsWhereInput;
  const orderByClause: Prisma.reddit_community_member_email_verificationsOrderByWithRelationInput[] =
    [
      {
        [sortBy]: sortOrder === "asc" ? "asc" : "desc",
      },
    ];
  const records: Array<RedditCommunityMemberEmailVerificationAtSummaryTransformer.Payload> =
    await MyGlobal.prisma.reddit_community_member_email_verifications.findMany({
      where: whereClause,
      orderBy: orderByClause,
      skip: skip,
      take: limit,
      ...RedditCommunityMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.reddit_community_member_email_verifications.count({
      where: whereClause,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityMemberEmailVerificationAtSummaryTransformer.transform,
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
// import { IRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberEmailVerification";
// import { IPageIRedditCommunityMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberEmailVerification";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMemberEmailVerifications(props: {
//   member: MemberPayload;
//   body: IRedditCommunityMemberEmailVerification.IRequest;
// }): Promise<IPageIRedditCommunityMemberEmailVerification.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_member_email_verifications.findMany({
//     ...RedditCommunityMemberEmailVerificationAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityMemberEmailVerificationAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------