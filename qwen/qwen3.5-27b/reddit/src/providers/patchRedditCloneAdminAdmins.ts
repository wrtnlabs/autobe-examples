import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneAdmin";
import { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCloneAdminAtSummaryTransformer } from "../transformers/RedditCloneAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneAdminAdmins(props: {
  admin: AdminPayload;
  body: IRedditCloneAdmin.IRequest;
}): Promise<IPageIRedditCloneAdmin.ISummary> {
  const body = props.body;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_adminsWhereInput = {};
  // Status filter
  if (body.status === "active") {
    whereInput.deleted_at = null;
  } else if (body.status === "deleted") {
    whereInput.deleted_at = { not: null };
  }
  // Username pattern filter
  if (body.username !== undefined && body.username.length > 0) {
    whereInput.username = {
      contains: body.username,
      mode: "insensitive",
    };
  }
  // Email pattern filter
  if (body.email !== undefined && body.email.length > 0) {
    whereInput.email = {
      contains: body.email,
      mode: "insensitive",
    };
  }
  // Date range filter
  if (body.created_after !== undefined) {
    whereInput.created_at = {
      gte: new Date(body.created_after),
    };
  }
  if (body.created_before !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    (whereInput.created_at as Prisma.DateTimeFilter).lte = new Date(
      body.created_before,
    );
  }
  // Build ORDER BY clause
  const sortBy = body.sort_by ?? "created_at";
  const sortDirection = body.sort_direction ?? "desc";
  const orderByInput: Prisma.reddit_clone_adminsOrderByWithRelationInput = {
    [sortBy]: sortDirection,
  };
  // Pagination: cursor-based or offset-based
  let data: Prisma.reddit_clone_adminsGetPayload<
    ReturnType<typeof RedditCloneAdminAtSummaryTransformer.select>
  >[];
  let total: number;
  let current: number;
  let limit: number;
  if (body.cursor !== undefined && body.cursor.length > 0) {
    // Cursor-based pagination
    limit = body.page_size ?? 100;
    current = 1;
    data = await MyGlobal.prisma.reddit_clone_admins.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip: 1,
      take: limit,
      cursor: { id: body.cursor },
      ...RedditCloneAdminAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_clone_admins.count({
      where: whereInput,
    });
  } else {
    // Offset-based pagination
    const page = body.page ?? 1;
    limit = body.limit ?? 100;
    const skip = (page - 1) * limit;
    current = page;
    data = await MyGlobal.prisma.reddit_clone_admins.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCloneAdminAtSummaryTransformer.select(),
    });
    total = await MyGlobal.prisma.reddit_clone_admins.count({
      where: whereInput,
    });
  }
  return {
    pagination: {
      current,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneAdminAtSummaryTransformer.transform,
    ),
  };
}
