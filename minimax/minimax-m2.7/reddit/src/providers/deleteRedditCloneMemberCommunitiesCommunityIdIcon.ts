import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberCommunitiesCommunityIdIcon(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
}): Promise<void> {
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        reddit_clone_member_id: true,
      },
    });
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("You are not the owner of this community", 403);
  }
  const icon = await MyGlobal.prisma.reddit_clone_community_icons.findUnique({
    where: { reddit_clone_community_id: props.communityId },
    select: {
      id: true,
      reddit_clone_file_id: true,
    },
  });
  if (!icon) {
    return;
  }
  await MyGlobal.prisma.reddit_clone_community_icons.delete({
    where: { id: icon.id },
  });
  await MyGlobal.prisma.reddit_clone_files.delete({
    where: { id: icon.reddit_clone_file_id },
  });
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteRedditCloneMemberCommunitiesCommunityIdIcon(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------