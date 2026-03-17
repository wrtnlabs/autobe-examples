import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwner";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwners(props: {
  body: IRedditLikeOwner.IRequest;
}): Promise<IPageIRedditLikeOwner.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const where: Prisma.reddit_like_ownersWhereInput = {
    deleted_at: null,
    ...(body.search && {
      OR: [
        { username: { contains: body.search, mode: "insensitive" as const } },
        { email: { contains: body.search, mode: "insensitive" as const } },
        {
          display_name: { contains: body.search, mode: "insensitive" as const },
        },
      ],
    }),
    ...(body.isActive !== undefined && { is_active: body.isActive }),
    ...(body.createdAtFrom !== undefined && body.createdAtTo !== undefined
      ? { created_at: { gte: body.createdAtFrom, lte: body.createdAtTo } }
      : body.createdAtFrom !== undefined
        ? { created_at: { gte: body.createdAtFrom } }
        : body.createdAtTo !== undefined
          ? { created_at: { lte: body.createdAtTo } }
          : {}),
  };
  // Parse sort
  const orderBy: Prisma.reddit_like_ownersOrderByWithRelationInput = (() => {
    if (!body.sort) {
      return { created_at: "desc" };
    }
    const [field, direction] = body.sort.split(":");
    const dir = direction === "asc" ? "asc" : "desc";
    if (field === "created_at") return { created_at: dir };
    if (field === "username") return { username: dir };
    if (field === "email") return { email: dir };
    return { created_at: "desc" };
  })();
  const data = await MyGlobal.prisma.reddit_like_owners.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      username: true,
      display_name: true,
      email: true,
      is_active: true,
    },
  });
  const total = await MyGlobal.prisma.reddit_like_owners.count({ where });
  return {
    data: data.map(
      (owner) =>
        ({
          id: owner.id as string & tags.Format<"uuid">,
          username: owner.username,
          displayName: owner.display_name,
          email: owner.email as string & tags.Format<"email">,
          isActive: owner.is_active,
        }) satisfies IRedditLikeOwner.ISummary,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
