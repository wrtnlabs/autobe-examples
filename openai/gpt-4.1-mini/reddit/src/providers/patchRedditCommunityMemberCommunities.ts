import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchRedditCommunityMemberCommunities(props: {
  member: MemberPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const { body } = props;

  const page = (body.page ?? 0) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;
  const limit = (body.limit ?? 20) as number &
    tags.Type<"int32"> &
    tags.Minimum<0> as number;

  // Convert date filters to ISO string safely
  const createdAtBeginIso: string | undefined =
    body.createdAtBegin !== undefined && body.createdAtBegin !== null
      ? typeof body.createdAtBegin === "string"
        ? body.createdAtBegin
        : toISOStringSafe(body.createdAtBegin)
      : undefined;
  const createdAtEndIso: string | undefined =
    body.createdAtEnd !== undefined && body.createdAtEnd !== null
      ? typeof body.createdAtEnd === "string"
        ? body.createdAtEnd
        : toISOStringSafe(body.createdAtEnd)
      : undefined;

  // Build where clause
  const where = {
    deleted_at: null,
    ...(body.name !== undefined && {
      name: { contains: body.name },
    }),
    ...(body.description !== undefined &&
      body.description !== null && {
        description: { contains: body.description },
      }),
    ...(createdAtBeginIso !== undefined || createdAtEndIso !== undefined
      ? {
          created_at: {
            ...(createdAtBeginIso !== undefined && {
              gte: createdAtBeginIso as string & tags.Format<"date-time">,
            }),
            ...(createdAtEndIso !== undefined && {
              lte: createdAtEndIso as string & tags.Format<"date-time">,
            }),
          },
        }
      : {}),
  };

  // Define orderBy inline with literal cast
  const sortDirection = (body.sortDirection === "asc" ? "asc" : "desc") as
    | "asc"
    | "desc";
  const orderBy =
    body.sortBy === "name"
      ? { name: sortDirection }
      : { created_at: sortDirection };

  // Calculate skip
  const skip = page * limit;

  // Fetch data and total count concurrently
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_communities.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        description: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_community_communities.count({
      where,
    }),
  ]);

  // Map data to ISummary type converting created_at to ISO string
  const mappedData = data.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description === null ? undefined : item.description,
    created_at: toISOStringSafe(item.created_at),
  }));

  // Return pagination info and data
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: mappedData,
  };
}
