import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserTopicSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserTopicSubscription";
import { IEEconDiscussTopicSubscriptionSortBy } from "@ORGANIZATION/PROJECT-api/lib/structures/IEEconDiscussTopicSubscriptionSortBy";
import { IESortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IESortOrder";
import { IPageIEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussTopic";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchEconDiscussMemberMeTopics(props: {
  member: MemberPayload;
  body: IEconDiscussUserTopicSubscription.IRequest;
}): Promise<IPageIEconDiscussTopic.ISummary> {
  const { member, body } = props;

  // Pagination defaults
  const page = Number(body.page ?? 1);
  const limit = Number(body.pageSize ?? 20);
  const skip = (page - 1) * limit;

  // Helper to normalize possible Date/string inputs to tagged date-time strings
  const normalizeDateTime = (
    v: unknown,
  ): (string & tags.Format<"date-time">) | null => {
    if (v === null || v === undefined) return null;
    const s = v instanceof Date ? toISOStringSafe(v) : typia.assert<string>(v);
    return typia.assert<string & tags.Format<"date-time">>(s);
  };

  // Filters
  const q = body.q ?? null;
  const topicIds = body.topicIds ?? null;
  const createdFrom = normalizeDateTime(body.createdFrom ?? null);
  const createdTo = normalizeDateTime(body.createdTo ?? null);

  // Sorting
  const sortBy: "createdAt" | "name" =
    body.sortBy === "name" ? "name" : "createdAt";
  const sortOrder: "asc" | "desc" = body.sortOrder === "asc" ? "asc" : "desc";

  // Where condition: scope to caller's active subscriptions and active topics
  const where = {
    econ_discuss_user_id: member.id satisfies string as string,
    deleted_at: null,
    ...(createdFrom !== null || createdTo !== null
      ? {
          created_at: {
            ...(createdFrom !== null
              ? { gte: createdFrom satisfies string as string }
              : {}),
            ...(createdTo !== null
              ? { lte: createdTo satisfies string as string }
              : {}),
          },
        }
      : {}),
    user: { is: { deleted_at: null } },
    topic: {
      is: {
        deleted_at: null,
        ...(topicIds !== null && topicIds.length > 0
          ? { id: { in: topicIds satisfies string[] as string[] } }
          : {}),
        ...(q !== null && q.trim().length > 0
          ? {
              OR: [
                { name: { contains: q, mode: Prisma.QueryMode.insensitive } },
                {
                  description: {
                    contains: q,
                    mode: Prisma.QueryMode.insensitive,
                  },
                },
              ],
            }
          : {}),
      },
    },
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.econ_discuss_user_topic_subscriptions.findMany({
      where,
      include: {
        topic: {
          select: { id: true, code: true, name: true },
        },
      },
      orderBy:
        sortBy === "createdAt"
          ? { created_at: sortOrder }
          : { topic: { name: sortOrder } },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.econ_discuss_user_topic_subscriptions.count({ where }),
  ]);

  // Ensure type of rows includes the relation 'topic' for mapping
  const rowsWithTopic = rows as Array<{
    topic: { id: string; code: string; name: string } | null;
  }>;

  const data = rowsWithTopic
    .filter((r) => r.topic !== null)
    .map((r) => ({
      id: typia.assert<string & tags.Format<"uuid">>(r.topic!.id),
      code: r.topic!.code,
      name: r.topic!.name,
    }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
