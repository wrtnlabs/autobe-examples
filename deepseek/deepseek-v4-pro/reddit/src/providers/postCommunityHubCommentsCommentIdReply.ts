import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommentTransformer } from "../transformers/CommunityHubCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityHubCommentsCommentIdReply(props: {
  commentId: string & tags.Format<"uuid">;
  body: ICommunityHubComment.ICreate;
}): Promise<ICommunityHubComment> {
  const parent = await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow(
    {
      where: { id: props.commentId },
      select: {
        id: true,
        community_hub_post_id: true,
        depth: true,
        deleted_at: true,
      },
    },
  );
  if (parent.deleted_at !== null) {
    throw new HttpException("The parent comment is no longer available.", 400);
  }
  const id: string = v4();
  const now: string = new Date().toISOString();
  const [comment] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.community_hub_comments.create({
      data: {
        id,
        content: props.body.content,
        depth: parent.depth + 1,
        vote_score: 0,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        post: { connect: { id: parent.community_hub_post_id } },
        author: { connect: { id: "" } },
        parentComment: { connect: { id: props.commentId } },
      },
      ...CommunityHubCommentTransformer.select(),
    }),
    MyGlobal.prisma.community_hub_posts.update({
      where: { id: parent.community_hub_post_id },
      data: { comment_count: { increment: 1 } },
    }),
  ]);
  return await CommunityHubCommentTransformer.transform(comment);
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
// import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postCommunityHubCommentsCommentIdReply(props: {
//   commentId: string & tags.Format<"uuid">;
//   body: ICommunityHubComment.ICreate;
// }): Promise<ICommunityHubComment> {
//   const record = await MyGlobal.prisma.community_hub_comments.create({
//     data: await CommunityHubCommentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...CommunityHubCommentTransformer.select(),
//   });
//   return await CommunityHubCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------