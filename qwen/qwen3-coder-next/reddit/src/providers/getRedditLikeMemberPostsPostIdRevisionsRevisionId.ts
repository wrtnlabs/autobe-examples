import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikePostRevision } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostRevision";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostRevisionTransformer } from "../transformers/RedditLikePostRevisionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostIdRevisionsRevisionId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  revisionId: number & tags.Type<"int32">;
}): Promise<IRedditLikePostRevision> {
  const revision =
    await MyGlobal.prisma.reddit_like_post_revisions.findUniqueOrThrow({
      where: {
        reddit_like_post_id_revision_number: {
          reddit_like_post_id: props.postId,
          revision_number: props.revisionId,
        },
      },
      include: {
        post: {
          select: {
            id: true,
            author_id: true,
            community_id: true,
            url: true,
            created_at: true,
            content: true,
            title: true,
            image_url: true,
          },
        },
      },
    });
  const isOwner = revision.post.author_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_like_moderator_roles.findFirst({
      where: {
        user_id: props.member.id,
        community_id: revision.post.community_id as string,
      },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  return await RedditLikePostRevisionTransformer.transform(revision);
}
