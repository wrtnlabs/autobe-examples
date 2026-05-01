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

export async function patchCommunityHubCommentsCommentId(props: {
  commentId: string & tags.Format<"uuid">;
  body: ICommunityHubComment.IUpdate;
}): Promise<ICommunityHubComment> {
  const existing =
    await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      select: {
        id: true,
        deleted_at: true,
      },
    });
  if (existing.deleted_at !== null) {
    throw new HttpException("Deleted comments cannot be edited", 403);
  }
  if (props.body.content === undefined || props.body.content === "") {
    throw new HttpException("Content must be a non-empty string", 422);
  }
  await MyGlobal.prisma.community_hub_comments.update({
    where: { id: props.commentId },
    data: {
      content: props.body.content,
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.community_hub_comments.findUniqueOrThrow({
      where: { id: props.commentId },
      ...CommunityHubCommentTransformer.select(),
    });
  return await CommunityHubCommentTransformer.transform(updated);
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
// export async function patchCommunityHubCommentsCommentId(props: {
//   commentId: string & tags.Format<"uuid">;
//   body: ICommunityHubComment.IUpdate;
// }): Promise<ICommunityHubComment> {
//   const record = await MyGlobal.prisma.community_hub_comments.findFirstOrThrow({
//     ...CommunityHubCommentTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------