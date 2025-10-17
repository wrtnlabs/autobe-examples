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

export async function patchEconPoliticalForumRegisteredUserUsersUserIdFollows(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  threadId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumThreadFollow.IRequest;
}): Promise<IEconPoliticalForumThreadFollow> {
  const { registeredUser, userId, threadId, body } = props;

  // Authorization: only the owner may modify their follows
  if (registeredUser.id !== userId) {
    throw new HttpException(
      "Forbidden: cannot modify another user's follows",
      403,
    );
  }

  // Ensure thread exists
  try {
    await MyGlobal.prisma.econ_political_forum_threads.findUniqueOrThrow({
      where: { id: threadId },
    });
  } catch (e) {
    throw new HttpException("Thread not found", 404);
  }

  // Extract optional business fields from body if provided by controller
  // NOTE: Controller validation is assumed; perform minimal business checks
  const payload = body as unknown as Record<string, unknown>;
  const unfollow = (payload.unfollow as boolean) ?? false;
  const mutedUntilRaw =
    (payload.muted_until as string | null | undefined) ?? undefined;

  // If muted_until provided, ensure it's a valid ISO date and in future (business rule)
  if (mutedUntilRaw !== undefined && mutedUntilRaw !== null) {
    const ts = Date.parse(mutedUntilRaw);
    if (Number.isNaN(ts)) {
      throw new HttpException("Bad Request: invalid muted_until format", 400);
    }
    if (ts <= Date.now()) {
      throw new HttpException(
        "Bad Request: muted_until must be a future timestamp",
        400,
      );
    }
  }

  // Find existing follow (including soft-deleted)
  const existing =
    await MyGlobal.prisma.econ_political_forum_thread_follows.findFirst({
      where: {
        registereduser_id: userId,
        thread_id: threadId,
      },
    });

  const now = toISOStringSafe(new Date());

  try {
    if (existing === null) {
      // Create new follow
      const created =
        await MyGlobal.prisma.econ_political_forum_thread_follows.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            registereduser_id: userId,
            thread_id: threadId,
            muted_until: mutedUntilRaw
              ? toISOStringSafe(mutedUntilRaw as any)
              : null,
            created_at: now,
            updated_at: now,
            deleted_at: null,
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
      } satisfies IEconPoliticalForumThreadFollow;
    }

    // existing found -> handle unfollow or update
    if (unfollow) {
      const deletedAt = toISOStringSafe(new Date());
      const updated =
        await MyGlobal.prisma.econ_political_forum_thread_follows.update({
          where: { id: existing.id },
          data: {
            deleted_at: deletedAt,
            updated_at: deletedAt,
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
      } satisfies IEconPoliticalForumThreadFollow;
    }

    // Update muted_until or reactivate if soft-deleted and muted provided
    const updateData: any = {
      updated_at: now,
      ...(mutedUntilRaw !== undefined && {
        muted_until: mutedUntilRaw
          ? toISOStringSafe(mutedUntilRaw as any)
          : null,
      }),
      ...(existing.deleted_at !== null && { deleted_at: null }),
    };

    const updated =
      await MyGlobal.prisma.econ_political_forum_thread_follows.update({
        where: { id: existing.id },
        data: updateData,
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
    } satisfies IEconPoliticalForumThreadFollow;
  } catch (err) {
    // Prisma unique constraint
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: follow already exists", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
