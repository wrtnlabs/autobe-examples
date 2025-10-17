import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPostTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPostTopic";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postEconDiscussMemberPostsPostIdTopics(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IEconDiscussPostTopic.ICreate;
}): Promise<IEconDiscussPostTopic> {
  const { member, postId, body } = props;

  // 1) Ensure post exists and is active (not soft-deleted)
  const post = await MyGlobal.prisma.econ_discuss_posts.findFirst({
    where: {
      id: postId,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_user_id: true,
    },
  });
  if (!post) throw new HttpException("Post not found", 404);

  // 2) Authorization: only author can manage associations (or elevated roles handled elsewhere)
  if (post.econ_discuss_user_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the author can manage post topics",
      403,
    );
  }

  // 3) Ensure topic exists and is active (not soft-deleted)
  const topic = await MyGlobal.prisma.econ_discuss_topics.findFirst({
    where: {
      id: body.econ_discuss_topic_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!topic) throw new HttpException("Topic not found or archived", 404);

  // 4) Idempotency: if active association already exists, return it
  const active = await MyGlobal.prisma.econ_discuss_post_topics.findFirst({
    where: {
      econ_discuss_post_id: postId,
      econ_discuss_topic_id: body.econ_discuss_topic_id,
      deleted_at: null,
    },
    select: {
      id: true,
      econ_discuss_post_id: true,
      econ_discuss_topic_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (active) {
    return {
      id: active.id as string & tags.Format<"uuid">,
      econ_discuss_post_id: active.econ_discuss_post_id as string &
        tags.Format<"uuid">,
      econ_discuss_topic_id: active.econ_discuss_topic_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(active.created_at),
      updated_at: toISOStringSafe(active.updated_at),
    };
  }

  // 5) If a historical (deleted) association exists, forbid reactivation here (policy)
  const anyAssoc = await MyGlobal.prisma.econ_discuss_post_topics.findFirst({
    where: {
      econ_discuss_post_id: postId,
      econ_discuss_topic_id: body.econ_discuss_topic_id,
    },
    select: { id: true, deleted_at: true },
  });
  if (anyAssoc && anyAssoc.deleted_at !== null) {
    throw new HttpException(
      "Conflict: Association was previously removed",
      409,
    );
  }

  // 6) Create new association
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const newId: string & tags.Format<"uuid"> = v4() as string &
    tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.econ_discuss_post_topics.create({
      data: {
        id: newId,
        econ_discuss_post_id: postId,
        econ_discuss_topic_id: body.econ_discuss_topic_id,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      select: {
        id: true,
        econ_discuss_post_id: true,
        econ_discuss_topic_id: true,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      econ_discuss_post_id: created.econ_discuss_post_id as string &
        tags.Format<"uuid">,
      econ_discuss_topic_id: created.econ_discuss_topic_id as string &
        tags.Format<"uuid">,
      created_at: now,
      updated_at: now,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint violation → treat idempotently: fetch active and return
      const existing = await MyGlobal.prisma.econ_discuss_post_topics.findFirst(
        {
          where: {
            econ_discuss_post_id: postId,
            econ_discuss_topic_id: body.econ_discuss_topic_id,
            deleted_at: null,
          },
          select: {
            id: true,
            econ_discuss_post_id: true,
            econ_discuss_topic_id: true,
            created_at: true,
            updated_at: true,
          },
        },
      );
      if (existing) {
        return {
          id: existing.id as string & tags.Format<"uuid">,
          econ_discuss_post_id: existing.econ_discuss_post_id as string &
            tags.Format<"uuid">,
          econ_discuss_topic_id: existing.econ_discuss_topic_id as string &
            tags.Format<"uuid">,
          created_at: toISOStringSafe(existing.created_at),
          updated_at: toISOStringSafe(existing.updated_at),
        };
      }
      throw new HttpException("Conflict: Association already exists", 409);
    }
    throw err;
  }
}
