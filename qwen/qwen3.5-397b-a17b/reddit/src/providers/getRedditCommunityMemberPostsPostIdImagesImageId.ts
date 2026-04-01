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
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberPostsPostIdImagesImageId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityPostImage> {
  const image =
    await MyGlobal.prisma.reddit_community_post_images.findUniqueOrThrow({
      where: { id: props.imageId },
      select: {
        id: true,
        file_path: true,
        file_size: true,
        mime_type: true,
        width: true,
        height: true,
        sort_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reddit_community_post_id: true,
        post: RedditCommunityPostAtSummaryTransformer.select(),
      },
    });
  if (image.reddit_community_post_id !== props.postId) {
    throw new HttpException("Image does not belong to the specified post", 404);
  }
  return {
    id: image.id,
    file_path: image.file_path,
    file_size: image.file_size,
    mime_type: image.mime_type,
    width: image.width,
    height: image.height,
    sort_order: image.sort_order,
    created_at: image.created_at.toISOString(),
    updated_at: image.updated_at.toISOString(),
    deleted_at: image.deleted_at?.toISOString() ?? null,
    post: await RedditCommunityPostAtSummaryTransformer.transform(image.post),
  };
}
