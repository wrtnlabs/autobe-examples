import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityPosts(props: {
  registeredUser: RegistereduserPayload;
  body: IRedditCommunityPost.ICreate;
}): Promise<IRedditCommunityPost> {
  const now = new Date();
  const nowString = toISOStringSafe(now) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: {
      id: v4() as string & import("typia").tags.Format<"uuid">,
      reddit_community_registereduser_id: props.registeredUser.id,
      reddit_community_community_id: props.body.reddit_community_community_id,
      reddit_community_registereduser_session_id:
        props.registeredUser.session_id,
      type: props.body.type,
      title: props.body.title,
      body: props.body.body ?? null,
      link_url: props.body.link_url ?? null,
      image_url: props.body.image_url ?? null,
      created_at: nowString,
      updated_at: nowString,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    reddit_community_registereduser_id:
      created.reddit_community_registereduser_id,
    reddit_community_community_id: created.reddit_community_community_id,
    reddit_community_registereduser_session_id:
      created.reddit_community_registereduser_session_id,
    type: typia.assert<"link" | "text" | "image">(created.type),
    title: created.title,
    body: created.body ?? null,
    link_url: created.link_url ?? null,
    image_url: created.image_url ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
