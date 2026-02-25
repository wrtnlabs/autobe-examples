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
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformPostTransformer } from "../transformers/CommunityPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformUserPostsPostId(props: {
  user: UserPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.IUpdate;
}): Promise<ICommunityPlatformPost> {
  // First, verify the post exists and the user is the owner
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: {
        id: props.postId,
        user_id: props.user.id, // ensure user owns the post
        deleted_at: null, // not soft-deleted
      },
      select: {
        id: true,
        user_id: true,
        title: true,
        post_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  // Validate 24-hour editing window
  const now = new Date();
  const created = post.created_at;
  const hoursSinceCreation =
    (now.getTime() - created.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation > 24) {
    throw new HttpException(
      "Post can only be edited within 24 hours of creation",
      403,
    );
  }
  // Prepare update data
  const updateData: Prisma.community_platform_postsUpdateInput = {
    updated_at: now,
  };
  // Only update title if provided in body
  if (props.body.title !== undefined && props.body.title !== null) {
    updateData.title = props.body.title;
  } else if (props.body.title === null) {
    // If null, don't update - keep existing
    // According to IUpdate type, title is optional (string | undefined)
  }
  // Perform update
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Fetch updated post with all relationships
  const updated =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  // Transform and return
  return await CommunityPlatformPostTransformer.transform(updated);
}
