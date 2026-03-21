import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMembers(props: {
  body: IRedditCloneMemberSession.IRequest;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      username: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.createdAfter && {
      created_at: {
        gte: new Date(props.body.createdAfter),
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lte: new Date(props.body.createdBefore),
      },
    }),
  } satisfies Prisma.reddit_clone_membersWhereInput;
  const orderByInput = props.body.search
    ? { username: "asc" as const }
    : { created_at: "desc" as const };
  const data = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneMemberSessionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCloneMemberSession.ISummary;
}
