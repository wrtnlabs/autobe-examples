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

export async function deleteCommunityHubMemberPostsPostIdVote(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, community_hub_member_id: true, deleted_at: true },
  });
  if (post.deleted_at !== null) {
    throw new HttpException("Post no longer exists", 404);
  }
  const vote = await MyGlobal.prisma.community_hub_votes.findFirst({
    where: {
      member_id: props.member.id,
      target_type: "post",
      target_id: props.postId,
    },
  });
  if (vote === null) {
    return;
  }
  const adjustment: number = vote.value === 1 ? -1 : 1;
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_hub_votes.delete({
      where: { id: vote.id },
    }),
    MyGlobal.prisma.community_hub_posts.update({
      where: { id: props.postId },
      data: { vote_score: { increment: adjustment } },
    }),
    MyGlobal.prisma.community_hub_members.update({
      where: { id: post.community_hub_member_id },
      data: { karma: { increment: adjustment } },
    }),
  ]);
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
// export async function deleteCommunityHubMemberPostsPostIdVote(props: {
//   member: MemberPayload;
//   postId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------