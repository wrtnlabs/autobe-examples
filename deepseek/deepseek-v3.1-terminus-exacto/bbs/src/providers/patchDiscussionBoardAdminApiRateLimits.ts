import { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import { IDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardApiRateLimit";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import { IPageIDiscussionBoardApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardApiRateLimit";
import { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminApiRateLimits(props: {
  admin: AdminPayload;
  body: IDiscussionBoardApiRateLimit.IRequest;
}): Promise<IPageIDiscussionBoardApiRateLimit.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE condition with complex filtering
  const whereInput = {
    deleted_at: null,
    AND: [
      props.body.search
        ? {
            endpoint_path: {
              contains: props.body.search,
              mode: "insensitive" as Prisma.QueryMode,
            },
          }
        : {},
      props.body.endpoint_path
        ? {
            endpoint_path: props.body.endpoint_path,
          }
        : {},
      props.body.http_method
        ? {
            http_method: props.body.http_method,
          }
        : {},
      props.body.rate_limit_type
        ? {
            rate_limit_type: props.body.rate_limit_type,
          }
        : {},
      props.body.enforcement_action
        ? {
            enforcement_action: props.body.enforcement_action,
          }
        : {},
      props.body.is_active !== undefined
        ? {
            is_active: props.body.is_active,
          }
        : {},
      props.body.created_at_from
        ? {
            created_at: { gte: new Date(props.body.created_at_from) },
          }
        : {},
      props.body.created_at_to
        ? {
            created_at: { lte: new Date(props.body.created_at_to) },
          }
        : {},
      props.body.updated_at_from
        ? {
            updated_at: { gte: new Date(props.body.updated_at_from) },
          }
        : {},
      props.body.updated_at_to
        ? {
            updated_at: { lte: new Date(props.body.updated_at_to) },
          }
        : {},
      props.body.enforced_at_from
        ? {
            enforced_at: { gte: new Date(props.body.enforced_at_from) },
          }
        : {},
      props.body.enforced_at_to
        ? {
            enforced_at: { lte: new Date(props.body.enforced_at_to) },
          }
        : {},
    ].filter((condition) => Object.keys(condition).length > 0),
  } satisfies Prisma.discussion_board_api_rate_limitsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_api_rate_limits.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.discussion_board_api_rate_limits.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
    data: data.map((item) => {
      const summary: IDiscussionBoardApiRateLimit.ISummary = {
        id: item.id as string & tags.Format<"uuid">,
        endpoint_path: item.endpoint_path,
        http_method: item.http_method,
        rate_limit_type: item.rate_limit_type,
        requests_per_interval: item.requests_per_interval as number &
          tags.Type<"int32">,
        interval_seconds: item.interval_seconds as number & tags.Type<"int32">,
        enforcement_action: item.enforcement_action,
        enforcement_count: item.enforcement_count as number &
          tags.Type<"int32">,
        is_active: item.is_active,
        enforced_at: item.enforced_at
          ? (toISOStringSafe(item.enforced_at) as string &
              tags.Format<"date-time">)
          : undefined,
        created_at: toISOStringSafe(item.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(item.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: item.deleted_at
          ? (toISOStringSafe(item.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      };
      return summary;
    }),
  } satisfies IPageIDiscussionBoardApiRateLimit.ISummary;
}
