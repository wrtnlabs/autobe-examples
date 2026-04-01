import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { RedditLikeOwnerAuditLogAtSummaryTransformer } from "../transformers/RedditLikeOwnerAuditLogAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeOwnerAuditLogs(props: {
  owner: OwnerPayload;
  body: IRedditLikeOwnerAuditLog.IRequest;
}): Promise<IPageIRedditLikeOwnerAuditLog.ISummary> {
  const page =
    typeof props.body.page === "string" && props.body.page.length > 0
      ? parseInt(props.body.page, 10)
      : 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const createdAtCondition: Prisma.DateTimeFilter<"reddit_like_owner_audit_logs"> =
    {};
  if (props.body.createdAtFrom !== undefined) {
    createdAtCondition.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined) {
    createdAtCondition.lte = new Date(props.body.createdAtTo);
  }
  const whereInput: Prisma.reddit_like_owner_audit_logsWhereInput = {
    ...(props.body.action !== undefined && { action: props.body.action }),
    ...(props.body.entityType !== undefined && {
      entity_type: props.body.entityType,
    }),
    ...(props.body.entityId !== undefined && {
      entity_id: props.body.entityId,
    }),
    ...(Object.keys(createdAtCondition).length > 0 && {
      created_at: createdAtCondition,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        OR: [
          {
            action: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
          {
            details: {
              contains: props.body.search,
              mode: "insensitive" as const,
            },
          },
        ],
      }),
  };
  const data = await MyGlobal.prisma.reddit_like_owner_audit_logs.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...RedditLikeOwnerAuditLogAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_owner_audit_logs.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditLikeOwnerAuditLogAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
