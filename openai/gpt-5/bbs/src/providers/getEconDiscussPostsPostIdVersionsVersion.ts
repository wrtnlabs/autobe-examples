import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostSnapshot";

export async function getEconDiscussPostsPostIdVersionsVersion(props: {
  postId: string & tags.Format<"uuid">;
  version: number & tags.Type<"int32">;
}): Promise<IEconDiscussPostSnapshot> {
  const { postId, version } = props;

  // Business rule: version must be positive integer
  if (!(Number(version) > 0)) {
    throw new HttpException("Bad Request: version must be positive", 400);
  }

  // Ensure parent post exists and is not soft-deleted
  const post = await MyGlobal.prisma.econ_discuss_posts.findUnique({
    where: { id: postId },
    select: { id: true, deleted_at: true },
  });
  if (!post || post.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }

  // Fetch the specific snapshot by (post_id, version), ignoring soft-deleted snapshots
  const snapshot = await MyGlobal.prisma.econ_discuss_post_snapshots.findFirst({
    where: {
      econ_discuss_post_id: postId,
      version: Number(version),
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_post_id: true,
      econ_discuss_user_id: true,
      version: true,
      title: true,
      body: true,
      summary: true,
      published_at: true,
      created_at: true,
      updated_at: true,
    },
  });

  if (!snapshot) {
    throw new HttpException("Not Found", 404);
  }

  return {
    id: snapshot.id as string & tags.Format<"uuid">,
    econ_discuss_post_id: snapshot.econ_discuss_post_id as string &
      tags.Format<"uuid">,
    econ_discuss_user_id: snapshot.econ_discuss_user_id as string &
      tags.Format<"uuid">,
    version: snapshot.version as number & tags.Type<"int32">,
    title: snapshot.title,
    body: snapshot.body,
    summary: snapshot.summary ?? null,
    published_at: snapshot.published_at
      ? toISOStringSafe(snapshot.published_at)
      : null,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
  };
}
