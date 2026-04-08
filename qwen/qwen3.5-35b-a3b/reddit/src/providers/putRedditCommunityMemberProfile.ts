import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityMemberTransformer } from "../transformers/RedditCommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberProfile(props: {
  member: MemberPayload;
  body: IRedditCommunityMember.IUpdate;
}): Promise<IRedditCommunityMember> {
  if (
    props.body.display_name !== undefined &&
    (typeof props.body.display_name !== "string" ||
      props.body.display_name.trim() === "")
  ) {
    throw new HttpException("Display name must be a non-empty string", 400);
  }
  const updateData: Prisma.reddit_community_membersUpdateInput = {};
  if (props.body.display_name !== undefined) {
    updateData.username = props.body.display_name;
  }
  const updatedMember = await MyGlobal.prisma.reddit_community_members.update({
    where: {
      id: props.member.id,
    },
    data: updateData,
    ...RedditCommunityMemberTransformer.select(),
  });
  return await RedditCommunityMemberTransformer.transform(updatedMember);
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
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCommunityMemberProfile(props: {
//   member: MemberPayload;
//   body: IRedditCommunityMember.IUpdate;
// }): Promise<IRedditCommunityMember> {
//   await MyGlobal.prisma.reddit_community_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_community_members.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCommunityMemberTransformer.select(),
//   });
//   return await RedditCommunityMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------