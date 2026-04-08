import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMember";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
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
  const whereInput: Prisma.reddit_clone_membersWhereInput = {};
  if (props.body.email !== undefined) {
    whereInput.email = {
      contains: props.body.email,
    };
  }
  if (props.body.username !== undefined) {
    whereInput.username = {
      contains: props.body.username,
    };
  }
  if (props.body.created_at_start !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  }
  if (props.body.created_at_end !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_end),
    };
  }
  if (props.body.status === "active") {
    whereInput.deleted_at = null;
  } else if (props.body.status === "deleted") {
    whereInput.deleted_at = {
      not: null,
    };
  }
  const orderByInput: Prisma.reddit_clone_membersOrderByWithRelationInput =
    props.body.sortBy === "created_at"
      ? { created_at: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "updated_at"
        ? { updated_at: props.body.sortOrder ?? "desc" }
        : props.body.sortBy === "username"
          ? { username: props.body.sortOrder ?? "asc" }
          : { created_at: "desc" };
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
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneMemberAtSummaryTransformer.transform,
    ),
  };
}
