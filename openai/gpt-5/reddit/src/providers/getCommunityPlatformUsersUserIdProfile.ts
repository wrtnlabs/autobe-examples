import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { ICommunityPlatformUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserKarma";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";

export async function getCommunityPlatformUsersUserIdProfile(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserProfile> {
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: { id: props.userId, deleted_at: null },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_uri: true,
    },
  });
  if (!user) {
    throw new HttpException("Not Found", 404);
  }

  const [karmaRow, postRows, commentRows] = await Promise.all([
    MyGlobal.prisma.community_platform_user_karmas.findFirst({
      where: { community_platform_user_id: user.id, deleted_at: null },
      select: {
        post_karma: true,
        comment_karma: true,
        total_karma: true,
      },
    }),
    MyGlobal.prisma.community_platform_posts.findMany({
      where: { community_platform_user_id: user.id, deleted_at: null },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_platform_community_id: true,
        title: true,
        type: true,
        nsfw: true,
        spoiler: true,
        visibility_state: true,
        locked_at: true,
        archived_at: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.community_platform_comments.findMany({
      where: { community_platform_user_id: user.id, deleted_at: null },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        community_platform_post_id: true,
        parent_id: true,
        locked_at: true,
        edited_at: true,
        edit_count: true,
        created_at: true,
      },
    }),
  ]);

  const karma = karmaRow
    ? {
        post_karma: karmaRow.post_karma as number & tags.Type<"int32">,
        comment_karma: karmaRow.comment_karma as number & tags.Type<"int32">,
        total_karma: karmaRow.total_karma as number & tags.Type<"int32">,
      }
    : {
        post_karma: 0 as number & tags.Type<"int32">,
        comment_karma: 0 as number & tags.Type<"int32">,
        total_karma: 0 as number & tags.Type<"int32">,
      };

  const posts: ICommunityPlatformPost.ISummary[] = postRows.map((p) => ({
    id: p.id as string & tags.Format<"uuid">,
    community_platform_community_id:
      p.community_platform_community_id as string & tags.Format<"uuid">,
    title: p.title,
    type: p.type as "TEXT" | "LINK" | "IMAGE",
    nsfw: p.nsfw,
    spoiler: p.spoiler,
    visibility_state: (p.visibility_state ?? null) as
      | "Active"
      | "Locked"
      | "Archived"
      | "RemovedByModeration"
      | "RemovedByAdmin"
      | "DeletedByAuthor"
      | "PendingReview"
      | "LegalHold"
      | null,
    locked_at: p.locked_at ? toISOStringSafe(p.locked_at) : null,
    archived_at: p.archived_at ? toISOStringSafe(p.archived_at) : null,
    created_at: toISOStringSafe(p.created_at),
  }));

  const comments: ICommunityPlatformComment.ISummary[] = commentRows.map(
    (c) => ({
      id: c.id as string & tags.Format<"uuid">,
      community_platform_post_id: c.community_platform_post_id as string &
        tags.Format<"uuid">,
      parent_id: c.parent_id
        ? (c.parent_id as string & tags.Format<"uuid">)
        : null,
      locked_at: c.locked_at ? toISOStringSafe(c.locked_at) : null,
      edited_at: c.edited_at ? toISOStringSafe(c.edited_at) : null,
      edit_count: c.edit_count as number & tags.Type<"int32">,
      created_at: toISOStringSafe(c.created_at),
    }),
  );

  return {
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name ?? null,
    avatar_uri: user.avatar_uri ?? null,
    karma,
    posts,
    comments,
  };
}
