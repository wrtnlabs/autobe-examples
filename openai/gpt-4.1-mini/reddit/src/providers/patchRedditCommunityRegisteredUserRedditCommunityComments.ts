import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import { IPageIRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityComment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function patchRedditCommunityRegisteredUserRedditCommunityComments(props: {
  registeredUser: RegisteredUserPayload;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  let page_size =
    props.body.page_size !== undefined ? props.body.page_size : 20;
  if (page_size < 1) page_size = 1;
  if (page_size > 100) page_size = 100;

  const skip = (page - 1) * page_size;

  const where = {
    deleted_at: null,
    ...(props.body.filter_author_id
      ? { reddit_community_registered_user_id: props.body.filter_author_id }
      : {}),
    ...(props.body.filter_community_id
      ? { community_id: props.body.filter_community_id }
      : {}),
    ...(props.body.filter_post_id
      ? { reddit_community_post_id: props.body.filter_post_id }
      : {}),
    ...(props.body.search_text && props.body.search_text.trim() !== ""
      ? { content: { contains: props.body.search_text } }
      : {}),
  };

  type OrderByField = "created_at" | "updated_at" | "votes_count";
  type OrderByDirection = "asc" | "desc";
  const orderByField = props.body.sort_field ?? "created_at";
  const orderByDirection = props.body.sort_order ?? "desc";

  if (!["created_at", "updated_at", "votes_count"].includes(orderByField)) {
    throw new HttpException(`Invalid sort_field: ${orderByField}`, 400);
  }
  if (!["asc", "desc"].includes(orderByDirection)) {
    throw new HttpException(`Invalid sort_order: ${orderByDirection}`, 400);
  }

  const [comments, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_comments.findMany({
      where,
      skip,
      take: page_size,
      orderBy: { [orderByField]: orderByDirection },
    }),
    MyGlobal.prisma.reddit_community_comments.count({ where }),
  ]);

  return {
    data: comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      author: {
        id: comment.reddit_community_registered_user_id satisfies string as string,
        username: "", // Username unavailable since not queried together
        profile_image_url: undefined, // Likewise
      },
      created_at: toISOStringSafe(comment.created_at),
      parent_comment_id:
        comment.parent_id === null ? undefined : comment.parent_id,
      score: 0, // votes_count unavailable, default to 0
    })),
    pagination: {
      current: page,
      limit: page_size,
      records: total,
      pages: Math.ceil(total / page_size),
    },
  };
}
