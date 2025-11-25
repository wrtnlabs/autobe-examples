import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postRedditCommunityRegisteredUserRedditCommunityPostsPostIdComments(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.ICreate;
}): Promise<IRedditCommunityComment> {
  const post = await MyGlobal.prisma.reddit_community_posts.findUnique({
    where: { id: props.postId },
    select: { id: true },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    const parentComment =
      await MyGlobal.prisma.reddit_community_comments.findUnique({
        where: { id: props.body.parent_id },
        select: { id: true, reddit_community_post_id: true },
      });

    if (
      !parentComment ||
      parentComment.reddit_community_post_id !== props.postId
    ) {
      throw new HttpException(
        "Parent comment not found or does not belong to the post",
        404,
      );
    }
  }

  const now = toISOStringSafe(new Date());
  const createdComment = await MyGlobal.prisma.reddit_community_comments.create(
    {
      data: {
        id: v4(),
        reddit_community_post_id: props.postId,
        reddit_community_registereduser_id: props.registeredUser.id,
        reddit_community_registereduser_session_id:
          props.registeredUser.session_id,
        parent_id: props.body.parent_id ?? null,
        body: props.body.body,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        reddit_community_post_id: true,
        parent_id: true,
        body: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reddit_community_registereduser_session_id: true,
      },
    },
  );

  const author =
    await MyGlobal.prisma.reddit_community_registeredusers.findUnique({
      where: { id: props.registeredUser.id },
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });

  if (!author) {
    throw new HttpException("Author not found", 404);
  }

  return {
    id: createdComment.id,
    post_id: createdComment.reddit_community_post_id,
    parent_id: createdComment.parent_id ?? undefined,
    author: {
      id: author.id,
      email: author.email,
      created_at: toISOStringSafe(author.created_at),
      updated_at: toISOStringSafe(author.updated_at),
      deleted_at: author.deleted_at ? toISOStringSafe(author.deleted_at) : null,
    },
    content: createdComment.body,
    created_at: toISOStringSafe(createdComment.created_at),
    updated_at: toISOStringSafe(createdComment.updated_at),
    deleted_at: createdComment.deleted_at
      ? toISOStringSafe(createdComment.deleted_at)
      : null,
    votes_count: 0,
    is_deleted: false,
    children_count: 0,
    author_session_id:
      createdComment.reddit_community_registereduser_session_id,
  };
}
