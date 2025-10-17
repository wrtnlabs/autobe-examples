import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberPostsPostIdPostVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.ICreate;
}): Promise<IRedditCommunityPostVote> {
  const { member, postId, body } = props;

  if (member.id !== body.member_id) {
    throw new HttpException("Unauthorized: member_id mismatch", 403);
  }

  if (postId !== body.post_id) {
    throw new HttpException(
      "Bad Request: postId path and body.post_id mismatch",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const existingVote =
    await MyGlobal.prisma.reddit_community_post_votes.findUnique({
      where: {
        member_id_post_id: {
          member_id: body.member_id,
          post_id: body.post_id,
        },
      },
    });

  if (existingVote) {
    const updated = await MyGlobal.prisma.reddit_community_post_votes.update({
      where: {
        member_id_post_id: {
          member_id: body.member_id,
          post_id: body.post_id,
        },
      },
      data: {
        vote_value: body.vote_value,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: updated.id,
      member_id: updated.member_id,
      post_id: updated.post_id,
      vote_value: updated.vote_value,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at),
    };
  } else {
    const created = await MyGlobal.prisma.reddit_community_post_votes.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: body.member_id,
        post_id: body.post_id,
        vote_value: body.vote_value,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    return {
      id: created.id,
      member_id: created.member_id,
      post_id: created.post_id,
      vote_value: created.vote_value,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        created.deleted_at === null
          ? null
          : toISOStringSafe(created.deleted_at),
    };
  }
}
