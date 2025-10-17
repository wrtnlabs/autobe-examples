import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function postRedditCommunityCommunityModeratorPostsPostIdComments(props: {
  communityModerator: CommunitymoderatorPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const { communityModerator, postId, body } = props;

  const now = toISOStringSafe(new Date());
  const id = v4();

  const created = await MyGlobal.prisma.reddit_community_comments.create({
    data: {
      id: id as string & tags.Format<"uuid">,
      reddit_community_post_id: postId,
      parent_comment_id: body.parent_comment_id ?? undefined,
      author_member_id: communityModerator.id,
      author_guest_id: undefined,
      body_text: body.body_text,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    reddit_community_post_id: created.reddit_community_post_id as string &
      tags.Format<"uuid">,
    parent_comment_id: created.parent_comment_id ?? undefined,
    author_member_id: created.author_member_id ?? undefined,
    author_guest_id: created.author_guest_id ?? undefined,
    body_text: created.body_text,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
