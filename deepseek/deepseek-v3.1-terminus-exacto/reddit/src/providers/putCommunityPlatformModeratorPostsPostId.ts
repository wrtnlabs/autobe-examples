import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformModeratorPostsPostId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // Verify post exists and get its moderators
  const postWithCommunity =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId, deleted_at: null },
      select: {
        id: true,
        community_id: true,
        community: {
          select: {
            id: true,
            moderators: {
              where: { user_id: props.moderator.id },
            },
          },
        },
      },
    });
  // Check moderator authority
  if (postWithCommunity.community.moderators.length === 0) {
    throw new HttpException(
      "Forbidden: Not a moderator of this community",
      403,
    );
  }
  // Prepare update data
  const updateData: Prisma.community_platform_postsUpdateInput = {};
  if (props.body.title !== undefined && props.body.title.trim().length > 0) {
    updateData.title = props.body.title;
  }
  // Only update if there are changes
  if (Object.keys(updateData).length > 0) {
    // Store current timestamp - using Date internally for Prisma
    updateData.updated_at = new Date();
    await MyGlobal.prisma.community_platform_posts.update({
      where: { id: props.postId },
      data: updateData,
    });
  }
  // Fetch complete updated post using transformer
  const updatedPost =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(updatedPost);
}
