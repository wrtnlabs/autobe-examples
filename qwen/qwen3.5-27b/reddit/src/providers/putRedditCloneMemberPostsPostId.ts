import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditClonePostTransformer } from "../transformers/RedditClonePostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePost.IUpdate;
}): Promise<IRedditClonePost> {
  // Step 1: Find the post and verify ownership
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_user_profile_id: true,
    },
  });
  // Step 2: Get member's user profile to verify ownership
  const memberProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUniqueOrThrow({
      where: {
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  // Step 3: Verify ownership
  if (post.reddit_clone_user_profile_id !== memberProfile.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Build update data
  const updateData: Prisma.reddit_clone_postsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }
  if (props.body.text_content !== undefined) {
    updateData.text_content = props.body.text_content;
  }
  if (props.body.link_url !== undefined) {
    updateData.link_url = props.body.link_url;
  }
  if (props.body.image_url !== undefined) {
    updateData.image_url = props.body.image_url;
  }
  await MyGlobal.prisma.reddit_clone_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Step 5: Return updated post
  const updated = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...RedditClonePostTransformer.select(),
  });
  return await RedditClonePostTransformer.transform(updated);
}
