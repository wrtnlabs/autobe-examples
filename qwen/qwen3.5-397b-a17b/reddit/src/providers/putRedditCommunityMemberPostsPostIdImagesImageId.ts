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
import { RedditCommunityPostImageTransformer } from "../transformers/RedditCommunityPostImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCommunityMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostImage.IUpdate;
}): Promise<IRedditCommunityPostImage> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, reddit_community_member_id: true },
  });
  if (post.reddit_community_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updated = await MyGlobal.prisma.reddit_community_post_images.update({
    where: { id: props.imageId, deleted_at: null },
    data: {
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
      updated_at: new Date(),
    },
    ...RedditCommunityPostImageTransformer.select(),
  });
  return await RedditCommunityPostImageTransformer.transform(updated);
}
