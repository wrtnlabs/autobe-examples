import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformUser";
import { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformUsers(props: {
  body: IRedditPlatformUser.IRequest;
}): Promise<IPageIRedditPlatformUser.ISummary> {
  const page = (props.body as any).page ?? 1;
  const limit = (props.body as any).limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where clause based on search criteria
  const where: Prisma.reddit_platform_usersWhereInput = {};
  // Search in display_name, username, and bio
  if ((props.body as any).search) {
    const searchPattern = `%${(props.body as any).search}%`;
    where.OR = [
      { display_name: { contains: searchPattern, mode: "insensitive" } },
      { username: { contains: searchPattern, mode: "insensitive" } },
      { bio: { contains: searchPattern, mode: "insensitive" } },
    ];
  }
  // Filter by karma score range
  if (
    (props.body as any).minKarma !== undefined ||
    (props.body as any).maxKarma !== undefined
  ) {
    where.karma_score = {};
    if ((props.body as any).minKarma !== undefined) {
      where.karma_score.gte = (props.body as any).minKarma;
    }
    if ((props.body as any).maxKarma !== undefined) {
      where.karma_score.lte = (props.body as any).maxKarma;
    }
  }
  // Fetch users with pagination
  const [users, total] = await Promise.all([
    MyGlobal.prisma.reddit_platform_users.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        (props.body as any).sort === "karma_desc"
          ? { karma_score: "desc" }
          : (props.body as any).sort === "karma_asc"
            ? { karma_score: "asc" }
            : (props.body as any).sort === "date_desc"
              ? { created_at: "desc" }
              : (props.body as any).sort === "date_asc"
                ? { created_at: "asc" }
                : { created_at: "desc" }, // Default sort
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma_score: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_platform_users.count({ where }),
  ]);
  // Transform to summary format
  const data: IRedditPlatformUser.ISummary[] = users.map((user) => ({
    id: user.id as string & tags.Format<"uuid">,
    username: user.username,
    display_name: user.display_name,
    bio: user.bio,
    avatar_url: user.avatar_url,
    karma_score: user.karma_score,
    created_at: toISOStringSafe(user.created_at) as string &
      tags.Format<"date-time">,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
