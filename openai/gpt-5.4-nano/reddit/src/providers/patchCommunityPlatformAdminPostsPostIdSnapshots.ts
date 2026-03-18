import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminPostsPostIdSnapshots(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<ICommunityPlatformPostSnapshot> {
  const orderDirection: "asc" | "desc" = props.body.orderDirection ?? "desc";
  const includeDeleted: boolean = props.body.includeDeleted === true;
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        deleted_at: true,
      },
    },
  );
  if (post.deleted_at !== null) {
    if (!includeDeleted) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const whereInput = {
    post_id: props.postId,
    ...(includeDeleted ? {} : { deleted_at: null }),
    ...(props.body.publishedAt !== undefined
      ? { published_at: props.body.publishedAt }
      : {}),
    ...(props.body.publishedAtRange !== undefined
      ? {
          published_at: {
            gte: props.body.publishedAtRange.from,
            lte: props.body.publishedAtRange.to,
          },
        }
      : {}),
  } satisfies Prisma.community_platform_post_snapshotsWhereInput;
  // Deterministic ordering: published_at plus created_at tie-breaker
  const orderByInput =
    orderDirection === "asc"
      ? { published_at: "asc" as const, created_at: "asc" as const }
      : ({
          published_at: "desc" as const,
          created_at: "desc" as const,
        } satisfies Prisma.community_platform_post_snapshotsOrderByWithRelationInput);
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip: skip,
      take: 1,
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
  if (snapshot.length === 0) {
    // align with not-found semantics for empty selection
    throw new HttpException("Not Found", 404);
  }
  const row = snapshot[0];
  return {
    id: row.id,
    postId: row.post_id,
    communityId: row.community_id,
    authorUserId: row.author_user_id,
    postType: row.post_type,
    title: row.title,
    body: row.body,
    linkUrl: row.link_url ?? null,
    editedByUserId: row.edited_by_user_id ?? null,
    deletedByUserId: row.deleted_by_user_id ?? null,
    publishedAt: row.published_at.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    deletedAt: row.deleted_at?.toISOString() ?? null,
  };
}
