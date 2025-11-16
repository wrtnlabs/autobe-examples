import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityComments(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id: v4(),
      reddit_community_post_id: props.body.post_id,
      reddit_community_registered_user_id: props.registeredUser.id,
      content: props.body.content,
      parent_id: props.body.parent_comment_id ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      // votes_count is probably managed by prisma automatically or not present, so omit
    },
  });

  return {
    id: created.id,
    post_id: created.reddit_community_post_id,
    author_id: created.reddit_community_registered_user_id,
    content: created.content,
    parent_comment_id: created.parent_id ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    votes_count: 0,
  };
}
