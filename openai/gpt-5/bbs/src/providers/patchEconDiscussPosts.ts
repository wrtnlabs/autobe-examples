import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussPost";
import { IPageIEconDiscussPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconDiscussPost";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchEconDiscussPosts(props: {
  body: IEconDiscussPost.IRequest;
}): Promise<IPageIEconDiscussPost.ISummary> {
  const { body } = props;

  const current: number = Number(body.page ?? 1);
  const limit: number = Number(body.pageSize ?? 20);
  const skip: number = (current - 1) * limit;

  const andConditions: any[] = [{ deleted_at: null }];

  if (body.q) {
    andConditions.push({
      OR: [
        { title: { contains: body.q } },
        { body: { contains: body.q } },
        { summary: { contains: body.q } },
      ],
    });
  }

  if (body.topicIds && body.topicIds.length > 0) {
    andConditions.push({
      econ_discuss_post_topics: {
        some: {
          econ_discuss_topic_id: { in: body.topicIds },
        },
      },
    });
  }

  if (body.author || body.expertOnly) {
    andConditions.push({
      author: {
        ...(body.author ? { display_name: { equals: body.author } } : {}),
        ...(body.expertOnly
          ? { econ_discuss_verified_experts: { is: { deleted_at: null } } }
          : {}),
      },
    });
  }

  if (body.dateFrom || body.dateTo) {
    const publishedRange: Record<string, unknown> = {};
    if (body.dateFrom) (publishedRange as any).gte = body.dateFrom;
    if (body.dateTo) (publishedRange as any).lte = body.dateTo;

    const createdRange: Record<string, unknown> = {};
    if (body.dateFrom) (createdRange as any).gte = body.dateFrom;
    if (body.dateTo) (createdRange as any).lte = body.dateTo;

    andConditions.push({
      OR: [
        { published_at: publishedRange },
        { AND: [{ published_at: null }, { created_at: createdRange }] },
      ],
    });
  }

  const total: number = await MyGlobal.prisma.econ_discuss_posts.count({
    where: { AND: andConditions },
  });

  const sortMode: "new" | "trending" | undefined = body.sort;

  const mapToSummary = (row: any): IEconDiscussPost.ISummary => ({
    id: row.id as string & tags.Format<"uuid">,
    title: row.title as string,
    summary: row.summary ?? null,
    author_user_id: row.econ_discuss_user_id as string & tags.Format<"uuid">,
    published_at: row.published_at ? toISOStringSafe(row.published_at) : null,
    created_at: toISOStringSafe(row.created_at),
  });

  if (sortMode === "trending") {
    const poolSize: number = Math.min(limit * Math.max(current, 1) * 5, 500);
    const candidates = await MyGlobal.prisma.econ_discuss_posts.findMany({
      where: { AND: andConditions },
      orderBy: [{ created_at: "desc" }],
      take: poolSize,
      select: {
        id: true,
        title: true,
        summary: true,
        econ_discuss_user_id: true,
        published_at: true,
        created_at: true,
      },
    });

    const candidateIds = candidates.map((c) => c.id);

    const sinceIso = toISOStringSafe(
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );

    const voteAgg =
      candidateIds.length === 0
        ? []
        : await MyGlobal.prisma.econ_discuss_post_votes.groupBy({
            by: ["econ_discuss_post_id"],
            where: {
              econ_discuss_post_id: { in: candidateIds },
              vote_type: "up",
              status: "active",
              deleted_at: null,
              created_at: { gte: sinceIso },
            },
            _count: { _all: true },
          });

    const scoreMap = new Map<string, number>();
    for (const v of voteAgg)
      scoreMap.set(v.econ_discuss_post_id, v._count._all);

    const sorted = [...candidates].sort((a, b) => {
      const sa = scoreMap.get(a.id) ?? 0;
      const sb = scoreMap.get(b.id) ?? 0;
      if (sb !== sa) return sb - sa;
      const at = (a.published_at ?? a.created_at).getTime();
      const bt = (b.published_at ?? b.created_at).getTime();
      return bt - at;
    });

    const paged = sorted.slice(skip, skip + limit);
    const data = paged.map(mapToSummary);

    return {
      pagination: {
        current: Number(current),
        limit: Number(limit),
        records: total,
        pages: Math.ceil(total / (limit || 1)),
      },
      data,
    };
  }

  const rows = await MyGlobal.prisma.econ_discuss_posts.findMany({
    where: { AND: andConditions },
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    skip: skip,
    take: limit,
    select: {
      id: true,
      title: true,
      summary: true,
      econ_discuss_user_id: true,
      published_at: true,
      created_at: true,
    },
  });

  const data = rows.map(mapToSummary);

  return {
    pagination: {
      current: Number(current),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / (limit || 1)),
    },
    data,
  };
}
