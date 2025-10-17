import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumThreadFollow } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumThreadFollow";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function postEconPoliticalForumRegisteredUserThreadsThreadIdFollows(props: {
  registeredUser: RegistereduserPayload;
  threadId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThreadFollow.ICreate;
}): Promise<IEconPoliticalForumThreadFollow> {
  const { registeredUser, threadId, body } = props;

  try {
    // Authorization: verify registered user account state
    const account =
      await MyGlobal.prisma.econ_political_forum_registereduser.findUnique({
        where: { id: registeredUser.id },
        select: {
          id: true,
          is_banned: true,
          banned_until: true,
          locked_until: true,
          deleted_at: true,
          email_verified: true,
        },
      });

    if (!account || account.deleted_at !== null) {
      throw new HttpException("Forbidden: account not found or removed", 403);
    }
    if (account.is_banned)
      throw new HttpException("Forbidden: account is banned", 403);
    if (!account.email_verified)
      throw new HttpException("Forbidden: email not verified", 403);
    if (account.banned_until && account.banned_until > new Date())
      throw new HttpException("Forbidden: temporarily banned", 403);
    if (account.locked_until && account.locked_until > new Date())
      throw new HttpException("Forbidden: account locked", 403);

    // Thread must exist and be active
    const thread =
      await MyGlobal.prisma.econ_political_forum_threads.findUnique({
        where: { id: threadId },
        select: { id: true, deleted_at: true },
      });
    if (!thread || thread.deleted_at !== null)
      throw new HttpException("Not Found: thread does not exist", 404);

    // Rate limiting: simple check (last 60s)
    const windowStart = toISOStringSafe(new Date(Date.now() - 60_000));
    const recentCount =
      await MyGlobal.prisma.econ_political_forum_thread_follows.count({
        where: {
          registereduser_id: registeredUser.id,
          created_at: { gte: windowStart },
        },
      });
    if (recentCount >= 10)
      throw new HttpException("Too Many Requests: rate limit exceeded", 429);

    // Idempotency: existing follow?
    const existing =
      await MyGlobal.prisma.econ_political_forum_thread_follows.findFirst({
        where: {
          registereduser_id: registeredUser.id,
          thread_id: threadId,
        },
      });

    if (existing && existing.deleted_at === null) {
      return {
        id: existing.id as string & tags.Format<"uuid">,
        registereduser_id: existing.registereduser_id as string &
          tags.Format<"uuid">,
        thread_id: existing.thread_id as string & tags.Format<"uuid">,
        muted_until: existing.muted_until
          ? toISOStringSafe(existing.muted_until)
          : null,
        created_at: toISOStringSafe(existing.created_at),
        updated_at: toISOStringSafe(existing.updated_at),
        deleted_at: existing.deleted_at
          ? toISOStringSafe(existing.deleted_at)
          : null,
      };
    }

    const now = toISOStringSafe(new Date());

    if (existing && existing.deleted_at !== null) {
      // Reactivate soft-deleted follow
      const updated =
        await MyGlobal.prisma.econ_political_forum_thread_follows.update({
          where: { id: existing.id },
          data: {
            deleted_at: null,
            muted_until:
              body.muted_until === undefined
                ? existing.muted_until
                : body.muted_until === null
                  ? null
                  : toISOStringSafe(body.muted_until),
            updated_at: now,
          },
        });

      return {
        id: updated.id as string & tags.Format<"uuid">,
        registereduser_id: updated.registereduser_id as string &
          tags.Format<"uuid">,
        thread_id: updated.thread_id as string & tags.Format<"uuid">,
        muted_until: updated.muted_until
          ? toISOStringSafe(updated.muted_until)
          : null,
        created_at: toISOStringSafe(updated.created_at),
        updated_at: toISOStringSafe(updated.updated_at),
        deleted_at: updated.deleted_at
          ? toISOStringSafe(updated.deleted_at)
          : null,
      };
    }

    // Create new follow
    const created =
      await MyGlobal.prisma.econ_political_forum_thread_follows.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          registereduser_id: registeredUser.id,
          thread_id: threadId,
          muted_until:
            body.muted_until === undefined
              ? null
              : body.muted_until === null
                ? null
                : toISOStringSafe(body.muted_until),
          created_at: now,
          updated_at: now,
        },
      });

    return {
      id: created.id as string & tags.Format<"uuid">,
      registereduser_id: created.registereduser_id as string &
        tags.Format<"uuid">,
      thread_id: created.thread_id as string & tags.Format<"uuid">,
      muted_until: created.muted_until
        ? toISOStringSafe(created.muted_until)
        : null,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
