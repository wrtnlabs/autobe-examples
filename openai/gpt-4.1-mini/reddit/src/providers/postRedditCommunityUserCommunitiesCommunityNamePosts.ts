import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunitiesCommunityNamePosts(props: {
  user: UserPayload;
  communityName: string;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const { user, communityName, body } = props;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName, deleted_at: null },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  const contentType =
    await MyGlobal.prisma.reddit_community_content_types.findUnique({
      where: { id: body.reddit_community_content_type_id },
      select: { id: true },
    });
  if (!contentType) {
    throw new HttpException("Content type not found", 404);
  }

  const postExists = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      reddit_community_community_id: community.id,
      title: body.title,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (postExists) {
    throw new HttpException("Duplicate post title in community", 409);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: {
      id: v4(),
      reddit_community_user_id: user.id,
      reddit_community_community_id: community.id,
      reddit_community_content_type_id: body.reddit_community_content_type_id,
      title: body.title,
      body: body.body,
      image_uri: body.image_uri ?? null,
      status: body.status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_community_user_id: created.reddit_community_user_id,
    reddit_community_community_id: created.reddit_community_community_id,
    reddit_community_content_type_id: created.reddit_community_content_type_id,
    title: created.title,
    body: created.body,
    image_uri: created.image_uri ?? null,
    status: created.status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };
}
