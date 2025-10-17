import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumBookmark";
import { IPageIEconPoliticalForumBookmark } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumBookmark";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";

export async function patchEconPoliticalForumRegisteredUserUsersUserIdBookmarks(props: {
  registeredUser: RegistereduserPayload;
  userId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumBookmark.IRequest;
}): Promise<IPageIEconPoliticalForumBookmark.ISummary> {
  const { registeredUser, userId, body } = props;

  // Ownership check - registered user may only list their own bookmarks
  const callerId = registeredUser.id as string & tags.Format<"uuid"> as string;
  const targetUserId = userId as string & tags.Format<"uuid"> as string;
  if (callerId !== targetUserId) {
    throw new HttpException(
      "Forbidden: cannot access another user's bookmarks",
      403,
    );
  }

  // Ensure target user exists
  try {
    await MyGlobal.prisma.econ_political_forum_registereduser.findUniqueOrThrow(
      {
        where: { id: targetUserId },
        select: { id: true },
      },
    );
  } catch (e) {
    throw new HttpException("Not Found", 404);
  }

  // Date range validation (inputs are ISO strings per DTO)
  if (
    body.createdFrom !== undefined &&
    body.createdFrom !== null &&
    body.createdTo !== undefined &&
    body.createdTo !== null
  ) {
    if (body.createdFrom > body.createdTo) {
      throw new HttpException(
        "createdFrom must be less than or equal to createdTo",
        400,
      );
    }
  }

  // includeDeleted is admin-only; registered user cannot request it here
  if (body.includeDeleted === true) {
    throw new HttpException(
      "Forbidden: includeDeleted requires elevated privileges",
      403,
    );
  }

  // Pagination normalization
  const page = Number(body.page ?? 1);
  const requestedLimit = Number(body.limit ?? 20);
  const limit = Math.min(Math.max(requestedLimit, 1), 100);
  const skip = (Math.max(page, 1) - 1) * limit;

  // Sorting
  const sortBy = body.sort_by ?? "created_at";
  const sortOrder: "asc" | "desc" = body.order === "asc" ? "asc" : "desc";

  // Build created_at filter if provided
  const createdAtFilter: Record<string, unknown> | undefined =
    (body.createdFrom !== undefined && body.createdFrom !== null) ||
    (body.createdTo !== undefined && body.createdTo !== null)
      ? {
          ...(body.createdFrom !== undefined &&
            body.createdFrom !== null && { gte: body.createdFrom }),
          ...(body.createdTo !== undefined &&
            body.createdTo !== null && { lte: body.createdTo }),
        }
      : undefined;

  try {
    const [rows, total] = await Promise.all([
      MyGlobal.prisma.econ_political_forum_bookmarks.findMany({
        where: {
          registereduser_id: targetUserId,
          deleted_at: null,
          ...(body.postId !== undefined && body.postId !== null
            ? { post_id: body.postId }
            : {}),
          ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
          post: {
            is_hidden: false,
            ...(body.threadId !== undefined && body.threadId !== null
              ? { thread_id: body.threadId }
              : {}),
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
        select: {
          id: true,
          post_id: true,
          created_at: true,
          updated_at: true,
        },
      }),
      MyGlobal.prisma.econ_political_forum_bookmarks.count({
        where: {
          registereduser_id: targetUserId,
          deleted_at: null,
          ...(body.postId !== undefined && body.postId !== null
            ? { post_id: body.postId }
            : {}),
          ...(createdAtFilter ? { created_at: createdAtFilter } : {}),
          post: {
            is_hidden: false,
            ...(body.threadId !== undefined && body.threadId !== null
              ? { thread_id: body.threadId }
              : {}),
          },
        },
      }),
    ]);

    const data = rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      created_at: toISOStringSafe(r.created_at),
      updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
    }));

    const pages = total === 0 ? 0 : Math.ceil(total / limit);

    return {
      pagination: {
        current: Number(page),
        limit: Number(limit),
        records: total,
        pages,
      },
      data,
    };
  } catch (err) {
    throw new HttpException("Internal Server Error", 500);
  }
}
