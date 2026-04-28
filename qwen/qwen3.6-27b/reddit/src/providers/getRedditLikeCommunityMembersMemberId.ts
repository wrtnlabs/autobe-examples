import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityMemberTransformer } from "../transformers/REdditLikeCommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeCommunityMembersMemberId(props: {
  memberId: string & tags.Format<"uuid">;
}): Promise<IREdditLikeCommunityMember> {
  const record =
    await MyGlobal.prisma.reddit_like_community_members.findFirstOrThrow({
      ...REdditLikeCommunityMemberTransformer.select(),
      where: { id: props.memberId },
    });
  return await REdditLikeCommunityMemberTransformer.transform(record);
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditLikeCommunityMembersMemberId(props: {
//   memberId: string & tags.Format<"uuid">;
// }): Promise<IREdditLikeCommunityMember> {
//   const record = await MyGlobal.prisma.reddit_like_community_members.findFirstOrThrow({
//     ...REdditLikeCommunityMemberTransformer.select(),
//     where: { ... },
//   });
//   return await REdditLikeCommunityMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------