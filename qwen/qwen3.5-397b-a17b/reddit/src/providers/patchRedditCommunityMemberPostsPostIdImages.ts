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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostTransformer } from "../transformers/RedditCommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdImages(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.IUpdate;
}): Promise<IRedditCommunityPost> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_community_member_id: true },
  });
  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updateData: Prisma.reddit_community_post_imagesUpdateInput = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.file_path !== undefined) {
    updateData.file_path = props.body.file_path;
  }
  if (props.body.file_size !== undefined) {
    updateData.file_size = props.body.file_size;
  }
  if (props.body.mime_type !== undefined) {
    updateData.mime_type = props.body.mime_type;
  }
  if (props.body.width !== undefined) {
    updateData.width = props.body.width;
  }
  if (props.body.height !== undefined) {
    updateData.height = props.body.height;
  }
  if (props.body.sort_order !== undefined) {
    updateData.sort_order = props.body.sort_order;
  }
  await MyGlobal.prisma.reddit_community_post_images.updateMany({
    where: {
      reddit_community_post_id: props.postId,
      deleted_at: null,
    },
    data: updateData,
  });
  const updatedPost =
    await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
      where: { id: props.postId },
      ...RedditCommunityPostTransformer.select(),
    });
  return await RedditCommunityPostTransformer.transform(updatedPost);
}
