import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string;
  body: ICommunityPost.IUpdate;
}): Promise<ICommunityPost> {
  // Step 1: Find the post and verify it exists and is not deleted
  const existingPost = await MyGlobal.prisma.community_posts.findUnique({
    where: { id: props.postId },
    select: {
      id: true,
      author_id: true,
      post_type: true,
      is_deleted: true,
    },
  });
  if (!existingPost || existingPost.is_deleted) {
    throw new HttpException("POST_NOT_FOUND", 404);
  }
  // Step 2: Verify ownership - only the author can update
  if (existingPost.author_id !== props.member.id) {
    throw new HttpException("NOT_POST_AUTHOR", 403);
  }
  // Step 3: Build update data based on post_type and provided fields
  const updateData = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(existingPost.post_type === "TEXT" &&
      props.body.text_content !== undefined && {
        text_content: props.body.text_content,
      }),
    ...(existingPost.post_type === "LINK" &&
      props.body.link_url !== undefined && { link_url: props.body.link_url }),
    edited_at: new Date(),
    updated_at: new Date(),
  } satisfies Prisma.community_postsUpdateInput;
  // Step 4: Perform the update
  await MyGlobal.prisma.community_posts.update({
    where: { id: props.postId },
    data: updateData,
  });
  // Step 5: Fetch and return the updated post with relations
  const updatedPost = await MyGlobal.prisma.community_posts.findUniqueOrThrow({
    where: { id: props.postId },
    ...CommunityPostTransformer.select(),
  });
  return CommunityPostTransformer.transform(updatedPost);
}
