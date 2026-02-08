import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformPostSnapshotsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  const record =
    await MyGlobal.prisma.community_platform_post_snapshots.findUnique({
      where: { id: props.id },
    });
  if (!record || record.deleted_at !== null) {
    throw new HttpException("Post snapshot not found", 404);
  }
  return {
    id: record.id as string & tags.Format<"uuid">,
    post_id: record.community_platform_post_id as string & tags.Format<"uuid">,
    author_id: (record.author_user_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
    community_id: (record.community_id ?? null) as
      | (string & tags.Format<"uuid">)
      | null,
    title: record.title,
    content_text: record.content_text,
    content_url: record.content_url,
    content_image_url: record.content_image_url,
    vote_score: record.vote_score,
    comment_count: record.comment_count,
    created_at: toISOStringSafe(record.created_at),
    updated_at:
      record.updated_at === null ? null : toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
