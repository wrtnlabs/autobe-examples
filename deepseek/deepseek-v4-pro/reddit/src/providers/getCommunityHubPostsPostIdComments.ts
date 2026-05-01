import { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommentAtListTransformer } from "../transformers/CommunityHubCommentAtListTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityHubPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityHubComment.IList> {
  // Step 1: Validate post exists and is not soft-deleted
  await MyGlobal.prisma.community_hub_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  // Step 2: Fetch all non-deleted comments for the post, sorted by best
  // (top-level first, then by vote_score DESC, created_at DESC)
  const allComments = await MyGlobal.prisma.community_hub_comments.findMany({
    ...CommunityHubCommentAtListTransformer.select(),
    where: {
      community_hub_post_id: props.postId,
      deleted_at: null,
    },
    orderBy: [
      { community_hub_parent_comment_id: { sort: "asc", nulls: "first" } },
      { vote_score: "desc" },
      { created_at: "desc" },
    ],
  });
  // Step 3: Transform into threaded conversation tree
  // transformAll handles recursive childComments via its built-in cache
  const result =
    await CommunityHubCommentAtListTransformer.transformAll(allComments);
  return result as unknown as ICommunityHubComment.IList;
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getCommunityHubPostsPostIdComments(props: {
//   postId: string & tags.Format<"uuid">;
// }): Promise<ICommunityHubComment.IList> {
//   const record = await MyGlobal.prisma.community_hub_comments.findFirstOrThrow({
//     ...CommunityHubCommentAtListTransformer.select(),
//     where: { ... },
//   });
//   return await CommunityHubCommentAtListTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------