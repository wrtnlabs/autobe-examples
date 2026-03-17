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

export async function deleteCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
}): Promise<void> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        community_platform_member_id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null || post.status !== "active") {
    throw new HttpException("Post is not available for vote interaction", 400);
  }
  const vote = await MyGlobal.prisma.community_platform_post_votes.findFirst({
    where: {
      community_platform_member_id: props.member.id,
      community_platform_post_id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (vote === null) {
    throw new HttpException("No active vote to remove", 400);
  }
  const now: string & tags.Format<"date-time"> =
    new globalThis.Date().toISOString();
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const result = await prisma.community_platform_post_votes.updateMany({
      where: {
        id: vote.id,
        deleted_at: null,
      },
      data: {
        updated_at: new globalThis.Date(now),
        deleted_at: new globalThis.Date(now),
      },
    });
    if (result.count !== 1) {
      throw new HttpException("No active vote to remove", 400);
    }
  });
}
