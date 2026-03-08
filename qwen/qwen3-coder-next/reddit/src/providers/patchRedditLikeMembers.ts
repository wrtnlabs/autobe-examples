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
import { RedditLikeMemberAtSummaryTransformer } from "../transformers/RedditLikeMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMembers(props: {
  body: IRedditLikeMember.IRequest;
}): Promise<IPageIRedditLikeMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause from search criteria
  const where: Prisma.reddit_like_membersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
        { email: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.community_id && {
      communities: {
        some: { id: props.body.community_id },
      },
    }),
    ...(props.body.author_id && {
      id: props.body.author_id,
    }),
  };
  // Get data and total count
  const [members, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_members.findMany({
      where,
      skip,
      take: limit,
      orderBy:
        props.body.sort === "newest"
          ? { created_at: "desc" }
          : props.body.sort === "oldest"
            ? { created_at: "asc" }
            : undefined,
      select: {
        id: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_like_members.count({ where }),
  ]);
  // Transform to ISummary using existing transformer
  const data = await ArrayUtil.asyncMap(
    members,
    RedditLikeMemberAtSummaryTransformer.transform,
  );
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
