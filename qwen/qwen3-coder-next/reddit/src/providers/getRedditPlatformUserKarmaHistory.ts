import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformKarmaHistory";
import { IRedditPlatformKarmaHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformKarmaHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getRedditPlatformUserKarmaHistory(props: {
  user: UserPayload;
}): Promise<IPageIRedditPlatformKarmaHistory> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.reddit_platform_karma_histories.findMany({
    where: {
      reddit_platform_user_id: props.user.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.reddit_platform_karma_histories.count({
    where: {
      reddit_platform_user_id: props.user.id,
      deleted_at: null,
    },
  });
  const transformedData: IRedditPlatformKarmaHistory[] = data.map((record) => {
    return {
      id: record.id as string & tags.Format<"uuid">,
      reddit_platform_user_id: record.reddit_platform_user_id as string &
        tags.Format<"uuid">,
      target_content_id:
        record.target_content_id === null
          ? undefined
          : (record.target_content_id as string & tags.Format<"uuid">),
      affected_by_user_id:
        record.affected_by_user_id === null
          ? undefined
          : (record.affected_by_user_id as string & tags.Format<"uuid">),
      change_type: record.change_type,
      amount: record.amount,
      balance_after: record.balance_after,
      vote_direction:
        record.vote_direction === null ? undefined : record.vote_direction,
      note: record.note === null ? undefined : record.note,
      created_at: toISOStringSafe(record.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(record.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        record.deleted_at === null
          ? undefined
          : (toISOStringSafe(record.deleted_at) as string &
              tags.Format<"date-time">),
    };
  });
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: limit > 0 && total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
