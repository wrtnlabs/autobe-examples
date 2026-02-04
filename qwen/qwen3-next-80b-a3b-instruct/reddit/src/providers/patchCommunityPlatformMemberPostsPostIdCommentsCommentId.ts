import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentAtInvertTransformer } from "../transformers/CommunityPlatformCommentAtInvertTransformer";

export async function patchCommunityPlatformMemberPostsPostIdCommentsCommentId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment.IInvert> {
  // Verify the comment exists and belongs to the specified post
  const comment = await MyGlobal.prisma.community_platform_comments.findUnique({
    where: {
      id: props.commentId,
      post_id: props.postId, // Use correct database field name from schema
    },
    ...CommunityPlatformCommentAtInvertTransformer.select(),
  });
  // Return 404 if comment not found
  if (!comment) {
    throw new HttpException("Comment not found", 404);
  }
  // Transform the Prisma result using the loaded transformer
  return await CommunityPlatformCommentAtInvertTransformer.transform(comment);
}
