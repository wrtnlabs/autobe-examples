import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScore";
import { IRedditCloneKarmaScore } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScore";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneKarmaScoreAtSummaryTransformer } from "../transformers/RedditCloneKarmaScoreAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneKarmaScores(props: {
  body: IRedditCloneKarmaScore.IRequest;
}): Promise<IPageIRedditCloneKarmaScore.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.member_id !== undefined && {
      member_id: props.body.member_id,
    }),
    ...(props.body.score_min !== undefined && {
      score: { gte: props.body.score_min },
    }),
    ...(props.body.score_max !== undefined && {
      score: { lte: props.body.score_max },
    }),
    ...(props.body.created_at_min !== undefined && {
      created_at: { gte: new Date(props.body.created_at_min) },
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: { lte: new Date(props.body.created_at_max) },
    }),
    ...(props.body.updated_at_min !== undefined && {
      updated_at: { gte: new Date(props.body.updated_at_min) },
    }),
    ...(props.body.updated_at_max !== undefined && {
      updated_at: { lte: new Date(props.body.updated_at_max) },
    }),
  } satisfies Prisma.reddit_clone_karma_scoresWhereInput;
  const orderByInput = parseSort(
    props.body.sort,
  ) satisfies Prisma.reddit_clone_karma_scoresOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_clone_karma_scores.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneKarmaScoreAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_karma_scores.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCloneKarmaScoreAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
function parseSort(
  sort: string | undefined,
): Prisma.reddit_clone_karma_scoresOrderByWithRelationInput {
  if (!sort) {
    return { created_at: "desc" };
  }
  const descending = sort.startsWith("-");
  const field = descending ? sort.slice(1) : sort;
  const direction = descending ? "desc" : "asc";
  if (field === "score") {
    return { score: direction };
  } else if (field === "created_at") {
    return { created_at: direction };
  } else if (field === "updated_at") {
    return { updated_at: direction };
  }
  return { created_at: "desc" };
}
