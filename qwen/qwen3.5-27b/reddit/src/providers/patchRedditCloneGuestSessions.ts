import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneMemberSession";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCloneMemberSessionAtSummaryTransformer } from "../transformers/RedditCloneMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneGuestSessions(props: {
  guest: GuestPayload;
  body: IRedditCloneMemberSession.IRequest;
}): Promise<IPageIRedditCloneMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_clone_member_sessionsWhereInput = {};
  if (props.body.ip !== undefined) {
    whereInput.ip = {
      contains: props.body.ip,
    };
  }
  if (props.body.created_at_start !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  }
  if (props.body.created_at_end !== undefined) {
    const lteValue = new Date(props.body.created_at_end);
    if (
      whereInput.created_at &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      whereInput.created_at = {
        gte: whereInput.created_at.gte,
        lte: lteValue,
      };
    } else {
      whereInput.created_at = {
        lte: lteValue,
      };
    }
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "active") {
      whereInput.expired_at = { gte: now };
    } else if (props.body.status === "expired") {
      whereInput.expired_at = { lt: now };
    }
  }
  if (props.body.user_agent !== undefined && props.body.user_agent !== null) {
    whereInput.user_agent = {
      contains: props.body.user_agent,
    };
  }
  const data = await MyGlobal.prisma.reddit_clone_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      created_at: "desc",
    },
    ...RedditCloneMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
