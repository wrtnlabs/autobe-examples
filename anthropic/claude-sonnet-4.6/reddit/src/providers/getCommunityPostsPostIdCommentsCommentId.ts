import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityCommentTransformer } from "../transformers/CommunityCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPostsPostIdCommentsCommentId(props: {
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityComment> {
  // Step 1: Verify the post exists and is not deleted
  await MyGlobal.prisma.community_posts.findFirstOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 2: Fetch the comment belonging to the specified post, not deleted
  const comment = await MyGlobal.prisma.community_comments.findFirstOrThrow({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    ...CommunityCommentTransformer.select(),
  });
  // Step 3: Transform and return
  return await CommunityCommentTransformer.transform(comment);
}
