import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSPost";
import { ICommunityBBSCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCitizen";
import { ICommunityBBSCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSCommunity";

export async function getCommunityBBSPostsPostId(props: {
  postId: string;
}): Promise<ICommunityBBSPost> {
  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: props.postId },
    include: {
      community: true,
      citizen: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  return {
    id: post.id,
    title: post.title,
    body: post.body === null ? undefined : post.body,
    status: post.status,
    created_at: toISOStringSafe(post.created_at),
    updated_at: post.updated_at ? toISOStringSafe(post.updated_at) : undefined,
    deleted_at: post.deleted_at ? toISOStringSafe(post.deleted_at) : undefined,
    author: {
      id: post.citizen.id,
      username: post.citizen.username,
      nickname: post.citizen.nickname === null ? null : post.citizen.nickname,
    },
    community: post.community.name,
  };
}
