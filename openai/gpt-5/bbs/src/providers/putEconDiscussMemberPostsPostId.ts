import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putEconDiscussMemberPostsPostId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPost.IUpdate;
}): Promise<IEconDiscussPost> {
  const { member, postId, body } = props;

  const existing = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: { id: postId, deleted_at: null },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  if (existing.econ_discuss_user_id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.econ_discuss_posts.update({
    where: { id: postId },
    data: {
      title: body.title ?? undefined,
      body: body.body ?? undefined,
      summary: body.summary === undefined ? undefined : body.summary,
      scheduled_publish_at:
        body.scheduled_publish_at === undefined
          ? undefined
          : body.scheduled_publish_at === null
            ? null
            : toISOStringSafe(body.scheduled_publish_at),
      updated_at: now,
    },
  });

  const latest = await MyGlobal.prisma.econ_discuss_post_snapshots.findFirst({
    where: { econ_discuss_post_id: postId },
    orderBy: { version: "desc" },
    select: { version: true },
  });
  const nextVersion = (latest?.version ?? 0) + 1;

  await MyGlobal.prisma.econ_discuss_post_snapshots.create({
    data: {
      id: v4(),
      econ_discuss_post_id: postId,
      econ_discuss_user_id: member.id,
      version: nextVersion,
      title: updated.title,
      body: updated.body,
      summary: updated.summary ?? null,
      published_at: updated.published_at
        ? toISOStringSafe(updated.published_at)
        : null,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    author_user_id: updated.econ_discuss_user_id as string &
      tags.Format<"uuid">,
    title: updated.title,
    body: updated.body,
    summary: updated.summary ?? null,
    published_at: updated.published_at
      ? toISOStringSafe(updated.published_at)
      : null,
    scheduled_publish_at: updated.scheduled_publish_at
      ? toISOStringSafe(updated.scheduled_publish_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
