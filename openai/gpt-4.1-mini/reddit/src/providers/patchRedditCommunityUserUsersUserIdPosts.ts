import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityContentType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentType";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchRedditCommunityUserUsersUserIdPosts(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const { user, userId, body } = props;

  const page = (body.page ?? 1) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 10) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const skip = (page - 1) * limit;

  const whereClause = {
    reddit_community_user_id: userId,
    status: body.status ?? undefined,
    deleted_at: null,
    ...(body.created_at_from
      ? { created_at: { gte: body.created_at_from } }
      : {}),
    ...(body.created_at_to ? { created_at: { lte: body.created_at_to } } : {}),
    ...(body.search
      ? {
          OR: [
            { title: { contains: body.search } },
            { body: { contains: body.search } },
          ],
        }
      : {}),
  };

  const resultsPromise = MyGlobal.prisma.reddit_community_posts.findMany({
    where: whereClause,
    orderBy: body.sort_by
      ? { [body.sort_by]: body.sort_order === "asc" ? "asc" : "desc" }
      : { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      body: true,
      image_uri: true,
      status: true,
      created_at: true,
      author: {
        select: {
          id: true,
          email: true,
        },
      },
      community: {
        select: {
          id: true,
          name: true,
        },
      },
      contentType: {
        select: {
          id: true,
          content_type_code: true,
          content_type_name: true,
          description: true,
        },
      },
    },
  });

  const countPromise = MyGlobal.prisma.reddit_community_posts.count({
    where: whereClause,
  });

  const [results, total] = await Promise.all([resultsPromise, countPromise]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: results.map((post) => ({
      id: post.id,
      title: post.title,
      body: post.body,
      image_uri: post.image_uri === null ? undefined : post.image_uri,
      status: post.status,
      created_at: toISOStringSafe(post.created_at),
      author: {
        id: post.author.id,
        email: post.author.email,
      },
      community: {
        id: post.community.id,
        name: post.community.name,
      },
      content_type: {
        id: post.contentType.id,
        content_type_code: post.contentType.content_type_code,
        content_type_name: post.contentType.content_type_name,
        description: post.contentType.description ?? null,
      },
    })),
  };
}
