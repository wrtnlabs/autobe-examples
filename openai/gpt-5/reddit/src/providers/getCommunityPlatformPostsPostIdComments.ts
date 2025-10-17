import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommentNode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentNode";

export async function getCommunityPlatformPostsPostIdComments(props: {
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformComment.ITree> {
  const { postId } = props;

  // 1) Ensure the post exists and is not soft-deleted
  const post = await MyGlobal.prisma.community_platform_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!post) {
    throw new HttpException("Not Found", 404);
  }

  // 2) Load all non-deleted comments for the post in deterministic order
  const rows = await MyGlobal.prisma.community_platform_comments.findMany({
    where: {
      community_platform_post_id: postId,
      deleted_at: null,
    },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
    select: {
      id: true,
      community_platform_post_id: true,
      community_platform_user_id: true,
      parent_id: true,
      body: true,
      locked_at: true,
      edited_at: true,
      edit_count: true,
      created_at: true,
      updated_at: true,
    },
  });

  // 3) Map to API comment structure with proper Date conversions
  const comments: ICommunityPlatformComment[] = rows.map((r) => ({
    id: r.id as string & tags.Format<"uuid">,
    community_platform_post_id: r.community_platform_post_id as string &
      tags.Format<"uuid">,
    community_platform_user_id: r.community_platform_user_id as string &
      tags.Format<"uuid">,
    parent_id:
      r.parent_id === null
        ? null
        : (r.parent_id as string & tags.Format<"uuid">),
    body: r.body,
    locked_at: r.locked_at ? toISOStringSafe(r.locked_at) : null,
    edited_at: r.edited_at ? toISOStringSafe(r.edited_at) : null,
    edit_count: r.edit_count as number & tags.Type<"int32">,
    created_at: toISOStringSafe(r.created_at),
    updated_at: toISOStringSafe(r.updated_at),
  }));

  // 4) Build tree structure
  const nodeMap = new Map<string, ICommunityPlatformCommentNode>();
  const roots: ICommunityPlatformCommentNode[] = [];

  // Initialize all nodes
  for (const c of comments) {
    nodeMap.set(c.id, { comment: c, children: [] });
  }

  // Link children to parents
  for (const c of comments) {
    const node = nodeMap.get(c.id)!;
    if (c.parent_id === null || c.parent_id === undefined) {
      roots.push(node);
      continue;
    }
    const parent = nodeMap.get(c.parent_id);
    if (parent) {
      parent.children.push(node);
    } else {
      // Orphaned due to filtered/deleted parent → treat as root
      roots.push(node);
    }
  }

  // 5) Return assembled tree
  return {
    post_id: postId,
    items: roots,
  };
}
