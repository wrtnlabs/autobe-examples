import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUnique({
      where: { id: props.body.community_id },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  if (community.deleted_at !== null) {
    throw new HttpException("Community has been deleted", 404);
  }

  const ban = await MyGlobal.prisma.reddit_community_community_bans.findFirst({
    where: {
      reddit_community_community_id: props.body.community_id,
      reddit_community_member_id: props.member.id,
      status: "active",
    },
  });

  if (ban !== null) {
    throw new HttpException("You are banned from this community", 403);
  }

  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: {
      id: v4(),
      reddit_community_community_id: props.body.community_id,
      reddit_community_member_id: props.member.id,
      title: props.body.title,
      post_type: props.body.post_type,
      body: props.body.body ?? null,
      url: props.body.url ?? null,
      image_url: props.body.image_url ?? null,
      edited: false,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });

  return {
    id: created.id,
    community_id: created.reddit_community_community_id,
    member_id: created.reddit_community_member_id,
    title: created.title,
    post_type: created.post_type as "text" | "link" | "image",
    body: created.body ?? undefined,
    url: created.url ?? undefined,
    image_url: created.image_url ?? undefined,
    edited: created.edited,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
