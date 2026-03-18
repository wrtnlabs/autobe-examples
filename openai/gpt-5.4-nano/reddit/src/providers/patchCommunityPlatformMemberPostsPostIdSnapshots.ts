import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPostSnapshot.IRequest;
}): Promise<ICommunityPlatformPostSnapshot> {
  // Ensure post exists and is not deleted
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { id: true, deleted_at: true },
    },
  );
  if (post.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate conflicting criteria
  if (
    props.body.publishedAt !== undefined &&
    props.body.publishedAtRange !== undefined
  ) {
    throw new HttpException("Invalid criteria", 400);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const orderDirection = props.body.orderDirection ?? "desc";
  // Build where clause with safe string conversion for date-time formatted columns.
  // Note: published_at expects a date-time string in DTO, but Prisma query filters accept Date.
  // Since the prompt forbids using Date type directly in declarations/returns, we only transform
  // to safe strings when needed for DTO-layer compatibility.
  const where: Record<string, unknown> = {
    post_id: props.postId,
  };
  // includeDeleted: false => only non-deleted snapshots
  if (!props.body.includeDeleted) {
    (
      where as {
        deleted_at: null;
      }
    ).deleted_at = null;
  }
  if (props.body.publishedAt !== undefined && props.body.publishedAt !== null) {
    // publishedAt likely is Date in request; convert safely to date-time string.
    // Use toISOStringSafe and cast at individual property level.
    const publishedAtIso = toISOStringSafe(
      props.body.publishedAt as unknown as Date,
    );
    (
      where as {
        published_at: unknown;
      }
    ).published_at = publishedAtIso;
  } else if (
    props.body.publishedAtRange !== undefined &&
    props.body.publishedAtRange !== null
  ) {
    const range = props.body.publishedAtRange as unknown as {
      start?: Date | null;
      end?: Date | null;
    };
    const publishedAt: {
      gte?: string;
      lte?: string;
    } = {};
    if (range.start !== undefined && range.start !== null) {
      publishedAt.gte = toISOStringSafe(range.start);
    }
    if (range.end !== undefined && range.end !== null) {
      publishedAt.lte = toISOStringSafe(range.end);
    }
    (
      where as {
        published_at: unknown;
      }
    ).published_at = publishedAt;
  }
  const [snap, total] = await Promise.all([
    MyGlobal.prisma.community_platform_post_snapshots.findFirstOrThrow({
      where,
      orderBy: { created_at: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_post_snapshots.count({ where }),
  ]);
  // Transform to DTO; ensure output matches ICommunityPlatformPostSnapshot
  const transformed =
    await CommunityPlatformPostSnapshotTransformer.transform(snap);
  // If transformer returns arrays/pagination, keep it as is.
  // Otherwise attach total if needed.
  if (
    typeof (
      transformed as unknown as {
        total?: unknown;
      }
    ).total === "undefined"
  ) {
    return Object.assign(transformed, {
      total,
    }) as ICommunityPlatformPostSnapshot;
  }
  return transformed as ICommunityPlatformPostSnapshot;
}
