import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostRevision";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPostIdRevisions(props: {
  guest: GuestPayload;
  postId: string;
  body: IRedditLikePostRevision.IRequest;
}): Promise<IPageIRedditLikePostRevision.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_like_post_revisions.findMany({
    where: {
      reddit_like_post_id: props.postId,
    },
    skip,
    take: limit,
    orderBy: { revision_number: "asc" },
    include: {
      post: {
        select: {
          author: {
            select: {
              id: true,
              username: true,
              display_name: true,
              bio: true,
              avatar_url: true,
              karma_score: true,
              created_at: true,
            },
          },
          type: true,
        },
      },
    },
  });
  const total = await MyGlobal.prisma.reddit_like_post_revisions.count({
    where: {
      reddit_like_post_id: props.postId,
    },
  });
  return {
    data: data.map((revision) => ({
      id: revision.id as string & tags.Format<"uuid">,
      title: revision.title,
      content: revision.content ?? undefined,
      url: revision.url ?? undefined,
      image_url: revision.image_url ?? undefined,
      revision_number: revision.revision_number,
      created_at: revision.created_at.toISOString() as string &
        tags.Format<"date-time">,
      author: {
        id: revision.post.author.id as string & tags.Format<"uuid">,
        username: revision.post.author.username,
        display_name: revision.post.author.display_name,
        bio: revision.post.author.bio ?? undefined,
        avatar_url: revision.post.author.avatar_url ?? undefined,
        karma_score: revision.post.author.karma_score,
        created_at: revision.post.author.created_at.toISOString() as string &
          tags.Format<"date-time">,
      } satisfies IRedditLikeMember.ISummary,
      type: revision.post.type as "text" | "link" | "image",
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
