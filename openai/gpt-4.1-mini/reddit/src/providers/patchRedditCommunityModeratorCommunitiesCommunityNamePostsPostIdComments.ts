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
import { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function patchRedditCommunityModeratorCommunitiesCommunityNamePostsPostIdComments(props: {
  moderator: ModeratorPayload;
  communityName: string;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityComment.IRequest;
}): Promise<IPageIRedditCommunityComment.ISummary> {
  const { moderator, communityName, postId, body } = props;

  const page =
    body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const limit =
    body.limit ?? (10 as number & tags.Type<"int32"> & tags.Minimum<0>);
  const skip = (page - 1) * limit;

  const community =
    await MyGlobal.prisma.reddit_community_communities.findFirst({
      where: { name: communityName, deleted_at: null },
    });

  if (!community) {
    throw new HttpException(`Community '${communityName}' not found`, 404);
  }

  const post = await MyGlobal.prisma.reddit_community_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
      reddit_community_community_id: community.id,
    },
  });

  if (!post) {
    throw new HttpException(
      `Post '${postId}' not found in community '${communityName}'`,
      404,
    );
  }

  const whereClause = {
    reddit_community_post_id: postId,
    deleted_at: null,
    ...(body.search !== undefined &&
      body.search !== null && {
        body: { contains: body.search },
      }),
  };

  const total = await MyGlobal.prisma.reddit_community_comments.count({
    where: whereClause,
  });

  const results = await MyGlobal.prisma.reddit_community_comments.findMany({
    where: whereClause,
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
    orderBy: {
      [body.sort === "updated_at" ? "updated_at" : "created_at"]:
        body.order === "asc" ? "asc" : "desc",
    },
    skip,
    take: limit,
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: results.map((comment) => ({
      id: comment.id,
      body: comment.body,
      author: {
        id: comment.user.id,
        email: comment.user.email,
      },
      post_id: comment.reddit_community_post_id,
      parent_id: comment.parent_id ?? undefined,
      created_at: toISOStringSafe(comment.created_at),
    })),
  };
}
