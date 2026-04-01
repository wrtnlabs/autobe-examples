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
import { RedditLikeOwnerAtSummaryTransformer } from "../transformers/RedditLikeOwnerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwners(props: {
  body: IRedditLikeOwner.IRequest;
}): Promise<IPageIRedditLikeOwner.ISummary> {
  const body = props.body;
  // Parse page and limit with sensible defaults
  const page = body.page && body.page > 0 ? body.page : 1;
  const limit =
    body.limit && body.limit > 0 && body.limit <= 100 ? body.limit : 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const whereInput: Prisma.reddit_like_ownersWhereInput = {
    deleted_at: null,
    ...(body.isActive !== undefined && { is_active: body.isActive }),
    ...(body.search && {
      OR: [
        { username: { contains: body.search, mode: "insensitive" } },
        { email: { contains: body.search, mode: "insensitive" } },
        { display_name: { contains: body.search, mode: "insensitive" } },
      ],
    }),
  };
  // Handle created_at date range filtering
  if (body.createdAtFrom !== undefined || body.createdAtTo !== undefined) {
    whereInput.created_at = {
      ...(body.createdAtFrom !== undefined && { gte: body.createdAtFrom }),
      ...(body.createdAtTo !== undefined && { lte: body.createdAtTo }),
    };
  }
  // Parse sort parameter (e.g., 'created_at:desc', 'username:asc')
  let orderByInput: Prisma.reddit_like_ownersOrderByWithRelationInput = {
    created_at: "desc",
  };
  if (body.sort) {
    const [field, direction] = body.sort.split(":") as [
      string,
      "asc" | "desc" | undefined,
    ];
    const sortDirection = direction === "asc" ? "asc" : "desc";
    if (field === "created_at") {
      orderByInput = { created_at: sortDirection };
    } else if (field === "username") {
      orderByInput = { username: sortDirection };
    } else if (field === "email") {
      orderByInput = { email: sortDirection };
    }
  }
  // Query owner records with pagination
  const data = await MyGlobal.prisma.reddit_like_owners.findMany({
    where: whereInput,
    ...(body.cursor ? { cursor: { id: body.cursor }, skip: 1 } : { skip }),
    take: limit,
    orderBy: orderByInput,
    ...RedditLikeOwnerAtSummaryTransformer.select(),
  });
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_like_owners.count({
    where: whereInput,
  });
  // Transform database records to DTOs
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditLikeOwnerAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
