import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";
import { IPageIRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityRegisteredUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchRedditCommunityAdminRedditCommunityRegisteredusers(props: {
  admin: AdminPayload;
  body: IRedditCommunityRegisteredUser.IRequest;
}): Promise<IPageIRedditCommunityRegisteredUser.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {};

  if (props.body.filterByStatus === "active") {
    whereCondition.deleted_at = null;
  } else if (props.body.filterByStatus === "inactive") {
    whereCondition.deleted_at = { not: null };
  } else if (props.body.filterByStatus === "deleted") {
    whereCondition.deleted_at = { not: null };
  }

  if (props.body.search) {
    // We will search in email with contains mode as sample
    whereCondition.email = { contains: props.body.search };
  }

  const orderByCondition: Record<string, "asc" | "desc"> = {};

  if (props.body.sortBy) {
    const sortOrder = props.body.sortOrder ?? "asc";
    orderByCondition[props.body.sortBy] = sortOrder;
  } else {
    orderByCondition.created_at = "desc";
  }

  const [users, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_registeredusers.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.reddit_community_registeredusers.count({
      where: whereCondition,
    }),
  ]);

  const data = users.map((user) => ({
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
