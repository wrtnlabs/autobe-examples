import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import { IPageIEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPoliticalForumRegisteredUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchEconPoliticalForumAdministratorUsers(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumRegisteredUser.IRequest;
}): Promise<IPageIEconPoliticalForumRegisteredUser.ISummary> {
  const { administrator, body } = props;

  // Authorization: ensure administrator is enrolled and active
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
      include: { registereduser: true },
    });

  if (
    !admin ||
    !admin.registereduser ||
    admin.registereduser.deleted_at !== null ||
    admin.registereduser.is_banned
  ) {
    throw new HttpException("Unauthorized: administrator access required", 403);
  }

  // Pagination defaults and limits
  const page = (body.page ?? 1) as number;
  const requestedLimit = (body.limit ?? 20) as number;
  const limit = Math.min(Math.max(Number(requestedLimit), 1), 100);
  const skip = (Number(page) - 1) * limit;

  // Sorting
  const sortBy = body.sortBy === "username" ? "username" : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  // Execute queries: findMany and count with identical where conditions
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_political_forum_registereduser.findMany({
      where: {
        ...(body.includeDeleted !== true && { deleted_at: null }),
        ...(body.username !== undefined &&
          body.username !== null && {
            username: { contains: body.username },
          }),
        ...(body.displayName !== undefined &&
          body.displayName !== null && {
            display_name: { contains: body.displayName },
          }),
        ...(body.emailVerified !== undefined && {
          email_verified: body.emailVerified,
        }),
        ...(body.isBanned !== undefined && { is_banned: body.isBanned }),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && { gte: body.createdFrom }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && { lte: body.createdTo }),
              },
            }
          : {}),
      },
      orderBy:
        sortBy === "username"
          ? { username: sortOrder }
          : { created_at: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_uri: true,
        created_at: true,
        updated_at: true,
      },
    }),

    MyGlobal.prisma.econ_political_forum_registereduser.count({
      where: {
        ...(body.includeDeleted !== true && { deleted_at: null }),
        ...(body.username !== undefined &&
          body.username !== null && {
            username: { contains: body.username },
          }),
        ...(body.displayName !== undefined &&
          body.displayName !== null && {
            display_name: { contains: body.displayName },
          }),
        ...(body.emailVerified !== undefined && {
          email_verified: body.emailVerified,
        }),
        ...(body.isBanned !== undefined && { is_banned: body.isBanned }),
        ...((body.createdFrom !== undefined && body.createdFrom !== null) ||
        (body.createdTo !== undefined && body.createdTo !== null)
          ? {
              created_at: {
                ...(body.createdFrom !== undefined &&
                  body.createdFrom !== null && { gte: body.createdFrom }),
                ...(body.createdTo !== undefined &&
                  body.createdTo !== null && { lte: body.createdTo }),
              },
            }
          : {}),
      },
    }),
  ]);

  // Map rows into summaries and convert Date fields to ISO strings
  const data = rows.map((r) => ({
    id: r.id,
    username: r.username,
    display_name: r.display_name === null ? undefined : r.display_name,
    bio: r.bio === null ? undefined : r.bio,
    avatar_uri: r.avatar_uri === null ? undefined : r.avatar_uri,
    created_at: r.created_at ? toISOStringSafe(r.created_at) : undefined,
    updated_at: r.updated_at ? toISOStringSafe(r.updated_at) : undefined,
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: Number(total),
    pages: Number(Math.max(1, Math.ceil(total / limit))),
  };

  return {
    pagination,
    data,
  };
}
