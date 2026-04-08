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

export async function deleteRedditPlatformMemberCommentsCommentId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
}): Promise<void> {
  const comment =
    await MyGlobal.prisma.reddit_platform_comments.findFirstOrThrow({
      where: {
        id: props.commentId,
        deleted_at: null,
      },
      include: {
        author: {
          select: {
            id: true,
          },
        },
        post: {
          select: {
            id: true,
            community_id: true,
          },
        },
      },
    });
  if (comment.author.id === props.member.id) {
    await MyGlobal.prisma.reddit_platform_comments.delete({
      where: {
        id: props.commentId,
      },
    });
    return;
  }
  const communityId = comment.post.community_id;
  const moderatorCheck =
    await MyGlobal.prisma.reddit_platform_community_members.findFirst({
      where: {
        user_id: props.member.id,
        community_id: communityId,
        role: "moderator",
        deleted_at: null,
      },
    });
  if (!moderatorCheck) {
    throw new HttpException("Unauthorized to delete this comment", 403);
  }
  await MyGlobal.prisma.reddit_platform_comments.delete({
    where: {
      id: props.commentId,
    },
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
// export async function deleteRedditPlatformMemberCommentsCommentId(props: {
//   member: MemberPayload;
//   commentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------