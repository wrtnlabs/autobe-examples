import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteRedditCloneMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_clone_posts.findUniqueOrThrow({
    where: { id: props.postId },
    select: {
      id: true,
      reddit_clone_user_profile_id: true,
    },
  });
  const memberProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUnique({
      where: { id: post.reddit_clone_user_profile_id },
      select: { id: true, reddit_clone_member_id: true },
    });
  if (memberProfile?.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const upvotes = await MyGlobal.prisma.reddit_clone_post_votes.count({
    where: {
      reddit_clone_post_id: props.postId,
      vote_type: "upvote",
      deleted_at: null,
    },
  });
  const downvotes = await MyGlobal.prisma.reddit_clone_post_votes.count({
    where: {
      reddit_clone_post_id: props.postId,
      vote_type: "downvote",
      deleted_at: null,
    },
  });
  const postScore = upvotes - downvotes;
  await MyGlobal.prisma.reddit_clone_posts.delete({
    where: { id: props.postId },
  });
  await MyGlobal.prisma.reddit_clone_user_profiles.update({
    where: { id: post.reddit_clone_user_profile_id },
    data: {
      karma: { decrement: postScore },
    },
  });
}
