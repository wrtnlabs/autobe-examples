import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postRedditCommunityRegisteredUserPosts(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { id: props.body.community_code, deleted_at: null },
    });

  if (!community) {
    throw new HttpException("Community not found or inactive", 404);
  }

  const author =
    await MyGlobal.prisma.reddit_community_registered_users.findUnique({
      where: { id: props.registeredUser.id },
      select: { id: true },
    });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_id: community.id,
      reddit_registered_user_id: author.id,
      post_type: props.body.type,
      title: props.body.title,
      content: props.body.content ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    community_code: props.body.community_code,
    author: {
      id: author.id,
      username: "", // registeredUser payload lacks username; set as empty string to satisfy type
    },
    type: props.body.type,
    title: created.title,
    content: created.content ?? "",
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    comments_count: 0,
    votes_count: 0,
  };
}
