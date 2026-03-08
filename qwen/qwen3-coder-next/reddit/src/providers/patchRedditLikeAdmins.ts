import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeAdmin";
import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeAdmins(props: {
  body: IRedditLikeAdmin.IRequest;
}): Promise<IPageIRedditLikeAdmin.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for filtering
  const where: Prisma.reddit_like_adminsWhereInput = {};
  // Trigram search on display_name and username
  if (props.body.search) {
    const searchPattern = `%${props.body.search}%`;
    where.OR = [
      { display_name: { contains: searchPattern, mode: "insensitive" } },
      { username: { contains: searchPattern, mode: "insensitive" } },
    ];
  }
  // Sort order - default to username since created_at doesn't exist
  const orderBy =
    props.body.sort === "created_at"
      ? { username: "asc" as const }
      : { username: "desc" as const };
  // Query data with transformer
  const data = await MyGlobal.prisma.reddit_like_admins.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    select: {
      id: true,
      username: true,
      display_name: true,
    },
  });
  // Transform to summary format
  const summaryData = data.map((admin) => ({
    id: admin.id as string & tags.Format<"uuid">,
    username: admin.username,
    display_name: admin.display_name,
  }));
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_like_admins.count({
    where,
  });
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data: summaryData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
  };
}
