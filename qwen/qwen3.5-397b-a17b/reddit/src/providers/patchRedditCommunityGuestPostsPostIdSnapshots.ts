import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityGuestPostsPostIdSnapshots(props: {
  guest: GuestPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const sortField = props.body.sort ?? "created_at";
  const order = props.body.order ?? "desc";
  const orderByInput = (
    sortField === "vote_score"
      ? { vote_score: order }
      : sortField === "comment_count"
        ? { comment_count: order }
        : { created_at: order }
  ) satisfies Prisma.reddit_community_post_snapshotsOrderByWithRelationInput;
  const whereInput: Prisma.reddit_community_post_snapshotsWhereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.from && { created_at: { gte: new Date(props.body.from) } }),
    ...(props.body.to && {
      created_at: {
        ...(props.body.from ? { gte: new Date(props.body.from) } : {}),
        lte: new Date(props.body.to),
      },
    }),
  } satisfies Prisma.reddit_community_post_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_post_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityPostSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditCommunityPostSnapshot.ISummary;
}
