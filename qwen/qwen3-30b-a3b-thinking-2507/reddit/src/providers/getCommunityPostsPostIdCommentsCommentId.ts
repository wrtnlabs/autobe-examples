import { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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
  const comment = await MyGlobal.prisma.community_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId,
      deleted_at: null,
    },
    ...CommunityCommentTransformer.select(),
  });
  if (!comment) throw new HttpException("Comment not found", 404);
  return await CommunityCommentTransformer.transform(comment);
}
