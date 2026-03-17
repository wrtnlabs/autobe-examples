import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberAtSummaryTransformer } from "../transformers/RedditCloneMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembers(props: {
  body: IRedditCloneMember.IRequest;
}): Promise<IPageIRedditCloneMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_membersWhereInput = {
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        { username: { contains: props.body.search, mode: "insensitive" } },
        { display_name: { contains: props.body.search, mode: "insensitive" } },
      ],
    }),
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" },
    }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name, mode: "insensitive" },
    }),
    ...(props.body.created_at_from && {
      created_at: { gte: new Date(props.body.created_at_from) },
    }),
    ...(props.body.created_at_to && {
      created_at: { lte: new Date(props.body.created_at_to) },
    }),
  } satisfies Prisma.reddit_clone_membersWhereInput;
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput =
    sortField === "karma"
      ? {
          karmaScore: {
            score: sortOrder as "asc" | "desc",
          },
        }
      : sortField === "username"
        ? {
            username: sortOrder as "asc" | "desc",
          }
        : {
            created_at: sortOrder as "asc" | "desc",
          };
  const data = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneMemberAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
