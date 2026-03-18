import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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

export async function patchCommunityPlatformGuestPostsPostIdSnapshots(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<ICommunityPlatformPostSnapshot> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, deleted_at: true },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderDirection = props.body.orderDirection ?? "desc";
  const where: Prisma.community_platform_post_snapshotsWhereInput = {
    post_id: props.postId,
    deleted_at: null,
    ...(props.body.publishedAt !== undefined
      ? { published_at: toISOStringSafe(props.body.publishedAt) }
      : props.body.publishedAtRange !== undefined
        ? {
            published_at: {
              gte: toISOStringSafe(props.body.publishedAtRange.from),
              lte: toISOStringSafe(props.body.publishedAtRange.to),
            },
          }
        : {}),
  };
  const snapshots =
    await MyGlobal.prisma.community_platform_post_snapshots.findMany({
      where,
      orderBy: [
        { published_at: orderDirection },
        { created_at: orderDirection },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        post_id: true,
        community_id: true,
        author_user_id: true,
        post_type: true,
        title: true,
        body: true,
        link_url: true,
        edited_by_user_id: true,
        deleted_by_user_id: true,
        published_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (snapshots.length === 0) {
    throw new HttpException("Not Found", 404);
  }
  const snapshot = snapshots[0];
  return {
    id: snapshot.id,
    postId: snapshot.post_id,
    communityId: snapshot.community_id,
    authorUserId: snapshot.author_user_id,
    postType: snapshot.post_type,
    title: snapshot.title,
    body: snapshot.body,
    linkUrl: snapshot.link_url ?? null,
    editedByUserId: snapshot.edited_by_user_id ?? null,
    deletedByUserId: snapshot.deleted_by_user_id ?? null,
    publishedAt: snapshot.published_at.toISOString(),
    createdAt: snapshot.created_at.toISOString(),
    updatedAt: snapshot.updated_at.toISOString(),
    deletedAt: snapshot.deleted_at?.toISOString() ?? null,
  };
}
