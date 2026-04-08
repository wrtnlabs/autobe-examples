import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberMemberSessions(props: {
  member: MemberPayload;
  body: IRedditCloneMemberSession.IRequest;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_member_sessionsWhereInput = {};
  // Filter by member_id if provided
  if (props.body.member_id !== undefined) {
    whereInput.reddit_clone_member_id = props.body.member_id;
  }
  // Filter by status (computed field based on deleted_at and expired_at)
  if (props.body.status === "active") {
    whereInput.deleted_at = null;
    whereInput.expired_at = {
      gt: toISOStringSafe(new Date()),
    };
  } else if (props.body.status === "expired") {
    whereInput.deleted_at = null;
    whereInput.expired_at = {
      lte: toISOStringSafe(new Date()),
    };
  } else if (props.body.status === "terminated") {
    whereInput.deleted_at = {
      not: null,
    };
  }
  // Filter by created_at range
  if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: props.body.created_at_from,
    };
  }
  if (props.body.created_at_to !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {
        lte: props.body.created_at_to,
      };
    } else {
      (
        whereInput.created_at as Prisma.DateTimeFilter<"reddit_clone_member_sessions">
      ).lte = props.body.created_at_to;
    }
  }
  // Filter by expired_at range
  if (props.body.expired_at_from !== undefined) {
    whereInput.expired_at = {
      gte: props.body.expired_at_from,
    };
  }
  if (props.body.expired_at_to !== undefined) {
    if (whereInput.expired_at === undefined) {
      whereInput.expired_at = {
        lte: props.body.expired_at_to,
      };
    } else {
      (
        whereInput.expired_at as Prisma.DateTimeFilter<"reddit_clone_member_sessions">
      ).lte = props.body.expired_at_to;
    }
  }
  // Build orderBy based on sort and order params
  const orderByInput: Prisma.reddit_clone_member_sessionsOrderByWithRelationInput =
    props.body.sort === undefined || props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : props.body.sort === "expired_at"
        ? { expired_at: props.body.order ?? "desc" }
        : props.body.sort === "deleted_at"
          ? { deleted_at: props.body.order ?? "desc" }
          : { created_at: props.body.order ?? "desc" };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_clone_member_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
