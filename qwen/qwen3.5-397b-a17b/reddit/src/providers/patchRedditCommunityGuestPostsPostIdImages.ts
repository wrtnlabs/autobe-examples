import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestPostsPostIdImages(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_community_member_id: true,
    },
  });
  if (post.reddit_community_member_id !== props.guest.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.reddit_community_post_images.updateMany({
    where: {
      reddit_community_post_id: props.postId,
      deleted_at: null,
    },
    data: {
      updated_at: new Date(),
      ...(props.body.file_path !== undefined && {
        file_path: props.body.file_path,
      }),
      ...(props.body.file_size !== undefined && {
        file_size: props.body.file_size,
      }),
      ...(props.body.mime_type !== undefined && {
        mime_type: props.body.mime_type,
      }),
      ...(props.body.width !== undefined && { width: props.body.width }),
      ...(props.body.height !== undefined && { height: props.body.height }),
      ...(props.body.sort_order !== undefined && {
        sort_order: props.body.sort_order,
      }),
    },
  });
  const updatedPost =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    });
  return await RedditCommunityPostTransformer.transform(updatedPost);
}
