import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformVoteSummaryTransformer } from "../transformers/CommunityPlatformVoteSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberVoteSummariesSummaryId(props: {
  member: MemberPayload;
  summaryId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformVoteSummary> {
  const record =
    await MyGlobal.prisma.community_platform_vote_summaries.findUniqueOrThrow({
      where: { id: props.summaryId },
      ...CommunityPlatformVoteSummaryTransformer.select(),
    });
  return await CommunityPlatformVoteSummaryTransformer.transform(record);
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
// import { ICommunityPlatformVoteSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteSummary";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityPlatformMemberVoteSummariesSummaryId(props: {
//   member: MemberPayload;
//   summaryId: string & tags.Format<"uuid">;
// }): Promise<ICommunityPlatformVoteSummary> {
//   const record = await MyGlobal.prisma.community_platform_vote_summaries.findFirstOrThrow({
//     ...CommunityPlatformVoteSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityPlatformVoteSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------