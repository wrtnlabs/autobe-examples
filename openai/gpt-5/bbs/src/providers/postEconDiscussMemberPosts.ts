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

export async function postEconDiscussMemberPosts(props: {
  member: MemberPayload;
  body: IEconDiscussPost.ICreate;
}): Promise<IEconDiscussPost> {
  const { member, body } = props;

  // Authorization: ensure member role is active and user is active (soft-delete aware)
  const memberRole = await MyGlobal.prisma.econ_discuss_members.findFirst({
    where: {
      user_id: member.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
  });
  if (memberRole === null) {
    throw new HttpException("Forbidden: inactive or missing member role", 403);
  }

  // Prepare identifiers and timestamps
  const postId = v4() as string & tags.Format<"uuid">;
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Normalize optional/nullable fields
  const scheduledAt: (string & tags.Format<"date-time">) | null =
    body.scheduled_publish_at === null
      ? null
      : body.scheduled_publish_at
        ? toISOStringSafe(body.scheduled_publish_at)
        : null;

  // Create the post (published_at set to null on creation, including scheduled case)
  await MyGlobal.prisma.econ_discuss_posts.create({
    data: {
      id: postId,
      econ_discuss_user_id: member.id,
      title: body.title,
      body: body.body,
      summary: body.summary ?? null,
      published_at: null,
      scheduled_publish_at: scheduledAt,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Topic associations if provided
  if (body.topicIds && body.topicIds.length > 0) {
    const topics = await MyGlobal.prisma.econ_discuss_topics.findMany({
      where: { id: { in: body.topicIds }, deleted_at: null },
      select: { id: true },
    });
    if (topics.length !== body.topicIds.length) {
      throw new HttpException(
        "Bad Request: Some topicIds are invalid or inactive",
        400,
      );
    }

    await MyGlobal.prisma.econ_discuss_post_topics.createMany({
      data: body.topicIds.map((topicId) => ({
        id: v4() as string & tags.Format<"uuid">,
        econ_discuss_post_id: postId,
        econ_discuss_topic_id: topicId,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      })),
      skipDuplicates: true,
    });
  }

  // Build response using prepared values (avoid Date objects from Prisma)
  return {
    id: postId,
    author_user_id: member.id,
    title: body.title,
    body: body.body,
    summary: body.summary ?? null,
    published_at: null,
    scheduled_publish_at: scheduledAt,
    created_at: now,
    updated_at: now,
  };
}
