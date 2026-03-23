import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneBlock";
import { IRedditCloneBlock } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBlock";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneBlockAtSummaryTransformer } from "../transformers/RedditCloneBlockAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberBlocks(props: {
  member: MemberPayload;
  body: IRedditCloneBlock.IRequest;
}): Promise<IPageIRedditCloneBlock.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.pageSize ?? props.body.limit ?? 20;
  const skip = (page - 1) * pageSize;
  const take = Math.min(pageSize, 100);
  const whereInput: Prisma.reddit_clone_blocksWhereInput = {
    blocker_id: props.member.id,
    deleted_at: null,
    ...(props.body.created_at_from && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.reddit_clone_blocksWhereInput;
  const orderByInput: Prisma.reddit_clone_blocksOrderByWithRelationInput = (
    props.body.sortBy === "blocked_user.username"
      ? {
          blockedUser: {
            username: (props.body.sortOrder ?? "DESC").toLowerCase() as
              | "asc"
              | "desc",
          },
        }
      : {
          created_at: (props.body.sortOrder ?? "DESC").toLowerCase() as
            | "asc"
            | "desc",
        }
  ) satisfies Prisma.reddit_clone_blocksOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_blocks.findMany({
    where: whereInput,
    skip,
    take,
    orderBy: orderByInput,
    ...RedditCloneBlockAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_blocks.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneBlockAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCloneBlock.ISummary;
}
