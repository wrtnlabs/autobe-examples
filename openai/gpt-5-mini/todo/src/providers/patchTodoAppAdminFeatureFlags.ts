import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppFeatureFlag";
import { IPageITodoAppFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppFeatureFlag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: ITodoAppFeatureFlag.IRequest;
}): Promise<IPageITodoAppFeatureFlag.ISummary> {
  const { admin, body } = props;

  // Authorization: ensure admin exists and is active
  const adminRecord = await MyGlobal.prisma.todo_app_admin.findUnique({
    where: { id: admin.id },
  });
  if (
    !adminRecord ||
    adminRecord.deleted_at !== null ||
    !adminRecord.is_active
  ) {
    throw new HttpException("Unauthorized", 403);
  }

  const page = body.page ?? 1;
  const pageSize = body.pageSize ?? 25;
  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Number(pageSize);

  // Build where condition inline
  const where: Record<string, unknown> = {
    ...(body.enabled !== undefined && { enabled: body.enabled }),
    // When includeDeleted is false or undefined, exclude soft-deleted records
    ...(body.includeDeleted ? {} : { deleted_at: null }),
  };

  if (body.key !== undefined && body.key !== null) {
    // partial match
    Object.assign(where, { key: { contains: body.key } });
  }

  if (
    (body.rolloutPercentageMin !== undefined &&
      body.rolloutPercentageMin !== null) ||
    (body.rolloutPercentageMax !== undefined &&
      body.rolloutPercentageMax !== null)
  ) {
    Object.assign(where, {
      rollout_percentage: {
        ...(body.rolloutPercentageMin !== undefined &&
          body.rolloutPercentageMin !== null && {
            gte: body.rolloutPercentageMin,
          }),
        ...(body.rolloutPercentageMax !== undefined &&
          body.rolloutPercentageMax !== null && {
            lte: body.rolloutPercentageMax,
          }),
      },
    });
  }

  if (
    (body.createdAtFrom !== undefined && body.createdAtFrom !== null) ||
    (body.createdAtTo !== undefined && body.createdAtTo !== null)
  ) {
    Object.assign(where, {
      created_at: {
        ...(body.createdAtFrom !== undefined &&
          body.createdAtFrom !== null && {
            gte: toISOStringSafe(body.createdAtFrom),
          }),
        ...(body.createdAtTo !== undefined &&
          body.createdAtTo !== null && {
            lte: toISOStringSafe(body.createdAtTo),
          }),
      },
    });
  }

  if (
    (body.updatedAtFrom !== undefined && body.updatedAtFrom !== null) ||
    (body.updatedAtTo !== undefined && body.updatedAtTo !== null)
  ) {
    Object.assign(where, {
      updated_at: {
        ...(body.updatedAtFrom !== undefined &&
          body.updatedAtFrom !== null && {
            gte: toISOStringSafe(body.updatedAtFrom),
          }),
        ...(body.updatedAtTo !== undefined &&
          body.updatedAtTo !== null && {
            lte: toISOStringSafe(body.updatedAtTo),
          }),
      },
    });
  }

  // Inline orderBy mapping (must be inline for Prisma type inference)
  const dir: "asc" | "desc" = body.order === "desc" ? "desc" : "asc";

  const orderBy =
    body.sortBy === "key"
      ? { key: dir }
      : body.sortBy === "rolloutPercentage"
        ? { rollout_percentage: dir }
        : body.sortBy === "updatedAt"
          ? { updated_at: dir }
          : { created_at: dir };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_app_feature_flags.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.todo_app_feature_flags.count({ where }),
  ]);

  const data = rows.map((r) => {
    return {
      id: r.id,
      key: r.key,
      enabled: r.enabled,
      rolloutPercentage: r.rollout_percentage ?? null,
      description: r.description ?? null,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : undefined,
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(pageSize),
      records: total,
      pages: Math.max(1, Math.ceil(total / Number(pageSize))),
    },
    data,
  };
}
