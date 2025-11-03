import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postRedditCommunityUserCommunitiesCommunityNamePostsPostIdComments(props: {
  user: UserPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const id = v4();
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id,
      reddit_community_post_id: props.postId,
      reddit_community_user_id: props.user.id,
      parent_id: props.body.parent_id ?? null,
      body: props.body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    reddit_community_post_id: created.reddit_community_post_id as string &
      tags.Format<"uuid">,
    reddit_community_user_id: created.reddit_community_user_id as string &
      tags.Format<"uuid">,
    parent_id: created.parent_id ?? null,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
