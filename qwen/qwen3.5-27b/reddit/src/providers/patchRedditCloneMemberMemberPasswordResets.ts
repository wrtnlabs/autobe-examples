import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberPasswordReset";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberPasswordResetAtSummaryTransformer } from "../transformers/RedditCloneMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditCloneMemberPasswordReset.IRequest;
}): Promise<IPageIRedditCloneMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput: Prisma.reddit_clone_member_password_resetsWhereInput = {};
  // Filter by member_id if provided
  if (props.body.member_id !== undefined) {
    whereInput.reddit_clone_member_id = props.body.member_id;
  }
  // Filter by status (used/unused)
  if (props.body.status === "used") {
    whereInput.used_at = {
      not: null,
    };
  } else if (props.body.status === "unused") {
    whereInput.used_at = null;
  }
  // Filter by created date range
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.created_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_from);
  }
  if (props.body.created_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Filter by expired status
  if (props.body.expired !== undefined) {
    const now = new Date();
    if (props.body.expired === true) {
      // Only expired tokens (expired_at < now)
      whereInput.expired_at = {
        lt: now,
      };
    } else {
      // Only valid tokens (expired_at >= now)
      whereInput.expired_at = {
        gte: now,
      };
    }
  }
  // Build ORDER BY clause
  const sortField = props.body.sort ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  const orderByInput: Prisma.reddit_clone_member_password_resetsOrderByWithRelationInput =
    {
      [sortField]: sortOrder,
    };
  // Fetch records
  const records =
    await MyGlobal.prisma.reddit_clone_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneMemberPasswordResetAtSummaryTransformer.select(),
    });
  // Count total records
  const total = await MyGlobal.prisma.reddit_clone_member_password_resets.count(
    {
      where: whereInput,
    },
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneMemberPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
