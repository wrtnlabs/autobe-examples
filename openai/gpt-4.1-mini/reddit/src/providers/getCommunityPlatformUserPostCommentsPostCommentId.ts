import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostComment";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostCommentTransformer } from "../transformers/CommunityPlatformPostCommentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserPostCommentsPostCommentId(props: {
  user: UserPayload;
  postCommentId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostComment> {
  const comment =
    await MyGlobal.prisma.community_platform_post_comments.findUniqueOrThrow({
      where: { id: props.postCommentId },
      ...CommunityPlatformPostCommentTransformer.select(),
    });
  if (comment.deleted_at !== null) {
    throw new HttpException("Comment not found", 404);
  }
  return await CommunityPlatformPostCommentTransformer.transform(comment);
}
