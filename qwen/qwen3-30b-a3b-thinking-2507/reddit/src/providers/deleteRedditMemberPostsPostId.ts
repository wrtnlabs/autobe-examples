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

export async function deleteRedditMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string;
}): Promise<void> {
  const post = await MyGlobal.prisma.reddit_posts.findUniqueOrThrow({
    where: { id: props.postId, deleted_at: null },
  });
  if (post.reddit_members_id !== props.member.id) {
    throw new HttpException(
      "You cannot delete posts created by other users.",
      403,
    );
  }
  const postCreation = new Date(post.created_at);
  const now = new Date();
  const hoursSinceCreation =
    (now.getTime() - postCreation.getTime()) / (1000 * 60 * 60);
  if (hoursSinceCreation <= 48) {
    const voteCount = await MyGlobal.prisma.reddit_post_votes.count({
      where: { post_id: props.postId },
    });
    if (voteCount > 0) {
      await MyGlobal.prisma.reddit_profiles.update({
        where: { id: post.reddit_members_id },
        data: { karma: { decrement: voteCount } },
      });
    }
  }
  await MyGlobal.prisma.reddit_posts.delete({
    where: { id: props.postId },
  });
  await MyGlobal.prisma.reddit_communities.update({
    where: { id: post.reddit_communities_id },
    data: { postCount: { decrement: 1 } },
  });
}
