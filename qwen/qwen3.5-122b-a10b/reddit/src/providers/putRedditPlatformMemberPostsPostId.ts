import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformPostTransformer } from "../transformers/RedditPlatformPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditPlatformPost.IUpdate;
}): Promise<IRedditPlatformPost> {
  // Find the post and verify it exists (not soft-deleted)
  const post = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: { id: true, author_id: true, post_type: true },
  });
  // Verify ownership - only the author can update
  if (post.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with conditional fields
  const updateData: Prisma.reddit_platform_postsUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.text_content !== undefined && {
      text_content: props.body.text_content,
    }),
    ...(props.body.url !== undefined && { url: props.body.url }),
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.reddit_platform_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Fetch the updated post with all relations for transformation
  const updated = await MyGlobal.prisma.reddit_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      ...RedditPlatformPostTransformer.select(),
    },
  );
  // Transform to API response format
  return await RedditPlatformPostTransformer.transform(updated);
}
