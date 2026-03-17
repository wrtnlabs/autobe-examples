import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneKarmaScoreChange";
import { IRedditCloneKarmaScoreChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneKarmaScoreChange";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneKarmaScoresKarmaScoreIdChanges(props: {
  karmaScoreId: string & tags.Format<"uuid">;
  body: IRedditCloneKarmaScoreChange.IRequest;
}): Promise<IPageIRedditCloneKarmaScoreChange.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.reddit_clone_karma_scores.findUniqueOrThrow({
    where: { id: props.karmaScoreId },
    select: { id: true },
  });
  const whereInput: Prisma.reddit_clone_karma_score_changesWhereInput = {
    reddit_clone_karma_score_id: props.karmaScoreId,
    ...(props.body.source_type !== undefined &&
      props.body.source_type !== null && {
        source_type: props.body.source_type,
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_from !== null && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.created_at_to !== undefined &&
      props.body.created_at_to !== null && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
    ...(props.body.change_amount_from !== undefined &&
      props.body.change_amount_from !== null && {
        change_amount: { gte: props.body.change_amount_from },
      }),
    ...(props.body.change_amount_to !== undefined &&
      props.body.change_amount_to !== null && {
        change_amount: { lte: props.body.change_amount_to },
      }),
  } satisfies Prisma.reddit_clone_karma_score_changesWhereInput;
  const orderByInput: Prisma.reddit_clone_karma_score_changesOrderByWithRelationInput =
    props.body.sort === "change_amount:asc"
      ? { change_amount: "asc" }
      : props.body.sort === "change_amount:desc"
        ? { change_amount: "desc" }
        : props.body.sort === "created_at:asc"
          ? { created_at: "asc" }
          : { created_at: "desc" };
  const [changes, total] = await Promise.all([
    MyGlobal.prisma.reddit_clone_karma_score_changes.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      select: {
        id: true,
        source_type: true,
        source_id: true,
        change_amount: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.reddit_clone_karma_score_changes.count({
      where: whereInput,
    }),
  ]);
  const changesWithTitles = await ArrayUtil.asyncMap(
    changes,
    async (change) => {
      let sourceTitle: string;
      if (change.source_type === "POST") {
        const post = await MyGlobal.prisma.reddit_clone_posts.findUnique({
          where: { id: change.source_id },
          select: { title: true },
        });
        sourceTitle = post?.title ?? "Deleted Post";
      } else {
        const comment = await MyGlobal.prisma.reddit_clone_comments.findUnique({
          where: { id: change.source_id },
          select: { body: true },
        });
        sourceTitle = comment?.body ?? "Deleted Comment";
      }
      const result: IRedditCloneKarmaScoreChange.ISummary = {
        id: change.id,
        source_type: change.source_type,
        source_title: sourceTitle,
        change_amount: change.change_amount,
        created_at: toISOStringSafe(change.created_at),
      };
      return result;
    },
  );
  const filteredData =
    props.body.search !== undefined && props.body.search !== null
      ? changesWithTitles.filter((change) =>
          change.source_title
            .toLowerCase()
            .includes(props.body.search!.toLowerCase()),
        )
      : changesWithTitles;
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: filteredData,
  } satisfies IPageIRedditCloneKarmaScoreChange.ISummary;
}
