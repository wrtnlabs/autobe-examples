import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
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

export async function postCommunityPlatformModeratorCommunitiesCommunityIdPostsPostIdDelete(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPost> {
  const post = await MyGlobal.prisma.community_platform_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      community_id: true,
      author_user_id: true,
      author_moderator_id: true,
    },
  });
  if (!post || post.community_id !== props.communityId) {
    throw new HttpException("Post not found in the specified community", 404);
  }
  const isAuthorUser = post.author_user_id === props.moderator.id;
  const isAuthorModerator = post.author_moderator_id === props.moderator.id;
  const isCommunityModerator =
    (await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        community_moderator_id: props.moderator.id,
        deleted_at: null,
      },
    })) !== null;
  if (!isAuthorUser && !isAuthorModerator && !isCommunityModerator) {
    throw new HttpException(
      "You do not have permission to delete this post",
      403,
    );
  }
  await MyGlobal.prisma.community_platform_posts.update({
    where: { id: props.postId },
    data: {
      deleted_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    },
  });
  const deletedPost =
    await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...CommunityPlatformPostTransformer.select(),
    });
  return await CommunityPlatformPostTransformer.transform(deletedPost);
}
