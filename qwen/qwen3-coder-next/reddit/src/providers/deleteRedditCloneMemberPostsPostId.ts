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
  postId: string;
}): Promise<void> {
  const post =
    await MyGlobal.prisma.reddit_clone_content_posts.findUniqueOrThrow({
      where: { id: props.postId },
    });
  // Check if the member is the author
  const isAuthor = post.author_id === props.member.id;
  if (!isAuthor) {
    // Check if the member is a moderator or owner of the community
    const moderatorAssignment =
      await MyGlobal.prisma.reddit_clone_moderator_assignments.findFirstOrThrow(
        {
          where: {
            community_id: post.community_id,
            appointed_actor_id: props.member.id,
            role: { in: ["moderator", "owner"] },
            status: "active",
          },
          select: { id: true }, // Only select what we need to confirm existence
        },
      );
    // If we get here, the member is a moderator/owner
    // If no record was found, findFirstOrThrow would have thrown a 404
    // So we only need to handle the case where the member is neither author nor moderator
  }
  await MyGlobal.prisma.reddit_clone_content_posts.delete({
    where: { id: props.postId },
  });
}
