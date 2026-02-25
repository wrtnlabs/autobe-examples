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

export async function putCommunityPlatformUserPostCommentsPostCommentId(props: {
  user: UserPayload;
  postCommentId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostComment.IUpdate;
}): Promise<ICommunityPlatformPostComment> {
  // Load existing comment to check ownership
  const existing =
    await MyGlobal.prisma.community_platform_post_comments.findUniqueOrThrow({
      where: { id: props.postCommentId },
      select: { user_id: true },
    });
  if (existing.user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.community_platform_post_comments.update(
    {
      where: { id: props.postCommentId },
      data: {
        content_text: props.body.contentText,
        updated_at: new Date().toISOString() as string &
          tags.Format<"date-time">,
      },
      ...CommunityPlatformPostCommentTransformer.select(),
    },
  );
  return CommunityPlatformPostCommentTransformer.transform(updated);
}
