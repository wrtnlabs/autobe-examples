import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

type IRedditLikePostRevision = {
  id: string;
  title: string;
  content: string | null;
  url: string | null;
  image_url: string | null;
  revision_number: number & tags.Type<"int32">;
  created_at: string & tags.Format<"date-time">;
  post?: {
    id: string;
    title: string;
    community_id: string;
  };
};
export async function getRedditLikeGuestPostsPostIdRevisionsRevisionId(props: {
  guest: GuestPayload;
  postId: string;
  revisionId: number & tags.Type<"int32">;
}): Promise<IRedditLikePostRevision> {
  const revision =
    await MyGlobal.prisma.reddit_like_post_revisions.findFirstOrThrow({
      where: {
        reddit_like_post_id: props.postId as string & tags.Format<"uuid">,
        revision_number: props.revisionId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        url: true,
        image_url: true,
        revision_number: true,
        created_at: true,
        post: {
          select: {
            id: true,
            title: true,
            community_id: true,
          },
        },
      },
    });
  return {
    id: revision.id,
    title: revision.title,
    content: revision.content ?? null,
    url: revision.url ?? null,
    image_url: revision.image_url ?? null,
    revision_number: revision.revision_number,
    created_at: toISOStringSafe(revision.created_at),
  };
}
