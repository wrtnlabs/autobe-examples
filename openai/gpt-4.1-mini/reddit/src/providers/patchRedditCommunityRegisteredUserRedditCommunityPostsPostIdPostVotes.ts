import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import { IPageIRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostVote";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunityPostsPostIdPostVotes(props: {
  registeredUser: RegistereduserPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostVote.IRequest;
}): Promise<IPageIRedditCommunityPostVote.ISummary> {
  // Verify that the target post exists and is not deleted
  const postExists = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: { id: props.postId, deleted_at: null },
  });
  if (!postExists) {
    throw new HttpException("Post not found", 404);
  }

  const page = (props.body.page > 0
    ? props.body.page
    : 1) satisfies number as number;
  const limit = (props.body.limit > 0
    ? props.body.limit
    : 100) satisfies number as number;
  const skip = ((page - 1) * limit) satisfies number as number;

  // Build Prisma where clause with filters
  const reddit_community_registereduser_id =
    props.body.reddit_community_registereduser_id !== null &&
    props.body.reddit_community_registereduser_id !== undefined
      ? (props.body
          .reddit_community_registereduser_id satisfies string as string)
      : undefined;

  const where = {
    deleted_at: null as null, // Only non-deleted votes
    reddit_community_post_id: props.postId,
    ...(reddit_community_registereduser_id !== undefined
      ? { reddit_community_registereduser_id }
      : {}),
    ...(props.body.vote_type !== undefined
      ? { vote_type: props.body.vote_type }
      : {}),
  };

  // Construct prisma orderBy object
  const orderBy =
    props.body.sortBy !== undefined && props.body.order !== undefined
      ? { [props.body.sortBy]: props.body.order }
      : ({ created_at: "desc" } satisfies { created_at: "asc" | "desc" });

  // Query data and total count concurrently
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_votes.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        vote_type: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_post_votes.count({ where }),
  ]);

  // Map records to ISummary type
  const data = records.map((record) => ({
    id: record.id,
    vote_type: record.vote_type,
    created_at: toISOStringSafe(record.created_at),
  }));

  // Calculate pagination
  const pages = Math.ceil(total / limit) satisfies number as number;

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data,
  };
}
