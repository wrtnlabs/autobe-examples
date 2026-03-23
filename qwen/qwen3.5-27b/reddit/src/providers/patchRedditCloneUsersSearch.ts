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

export async function patchRedditCloneUsersSearch(props: {
  body: IRedditCloneMember.IRequest;
}): Promise<IPageIRedditCloneMember.ISummary> {
  const page = props.body.page ?? 1;
  const pageSize = props.body.page_size ?? 20;
  const skip = (page - 1) * pageSize;
  const whereInput: Prisma.reddit_clone_membersWhereInput = {
    deleted_at: null,
  };
  if (props.body.search) {
    whereInput.OR = [
      {
        username: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        display_name: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  if (props.body.username) {
    whereInput.username = {
      contains: props.body.username,
      mode: "insensitive",
    };
  }
  if (props.body.display_name) {
    whereInput.display_name = {
      contains: props.body.display_name,
      mode: "insensitive",
    };
  }
  if (props.body.email) {
    whereInput.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.karma_min !== undefined) {
    whereInput.karma = {
      gte: props.body.karma_min,
    };
  }
  if (props.body.karma_max !== undefined) {
    whereInput.karma = {
      lte: props.body.karma_max,
    };
  }
  if (props.body.created_after) {
    whereInput.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before) {
    whereInput.created_at = {
      lte: new Date(props.body.created_before),
    };
  }
  const sortBy = props.body.sort_by ?? "karma";
  const sortOrder =
    props.body.sort_order ?? (sortBy === "karma" ? "desc" : "asc");
  const orderByInput: Prisma.reddit_clone_membersOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };
  const data = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: whereInput,
    skip,
    take: pageSize,
    orderBy: orderByInput,
    ...RedditCloneMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_members.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCloneMemberAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
    data: transformedData,
  };
}
