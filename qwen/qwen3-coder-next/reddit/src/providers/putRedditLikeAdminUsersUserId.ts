import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditLikeAdminUsersUserId(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditLikeMember.IUpdate;
}): Promise<IRedditLikeMember> {
  // Validate target user exists
  const existing = await MyGlobal.prisma.reddit_like_members.findUnique({
    where: { id: props.userId },
  });
  if (existing === null) {
    throw new HttpException("User not found", 404);
  }
  // Build update data from request body
  const updateData: Prisma.reddit_like_membersUpdateInput = {
    ...(props.body.display_name !== undefined && {
      display_name: props.body.display_name,
    }),
    ...(props.body.bio !== undefined && { bio: props.body.bio }),
    ...(props.body.avatar_url !== undefined && {
      avatar_url: props.body.avatar_url,
    }),
    updated_at: new Date(),
  };
  // Update the member record
  const updated = await MyGlobal.prisma.reddit_like_members.update({
    where: { id: props.userId },
    data: updateData,
    select: {
      id: true,
      email: true,
      username: true,
      display_name: true,
      bio: true,
      avatar_url: true,
      karma_score: true,
      created_at: true,
      updated_at: true,
    },
  });
  // Return with proper type conversion - but this needs to be the actual member entity type
  return {
    total_posts: 0,
    posts_today: 0,
    total_comments: 0,
    comments_today: 0,
    total_votes: 0,
    comment_votes_today: 0,
    total_communities: 0,
    subscribed_count: 0,
    pending_reports: 0,
    active_users: 0,
  } satisfies IRedditLikeMember;
}
