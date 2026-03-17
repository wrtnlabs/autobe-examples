import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeMember";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMembers(props: {
  body: IRedditLikeMember.IRequest;
}): Promise<IPageIRedditLikeMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause with available filters
  const whereInput = {
    deleted_at: null, // Only active accounts
    ...(props.body.search && {
      OR: [
        {
          email: { contains: props.body.search, mode: "insensitive" as const },
        },
        {
          username: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.reddit_like_membersWhereInput;
  // Query members with pagination
  const members = await MyGlobal.prisma.reddit_like_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      email: true,
      username: true,
      email_verified: true,
      created_at: true,
    },
  });
  // Count total records
  const total = await MyGlobal.prisma.reddit_like_members.count({
    where: whereInput,
  });
  // Transform to DTO format
  const data: IRedditLikeMember.ISummary[] = members.map((member) => ({
    id: member.id as string & tags.Format<"uuid">,
    email: member.email as string & tags.Format<"email">,
    username: member.username,
    emailVerified: member.email_verified,
    createdAt: member.created_at.toISOString() as string &
      tags.Format<"date-time">,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
