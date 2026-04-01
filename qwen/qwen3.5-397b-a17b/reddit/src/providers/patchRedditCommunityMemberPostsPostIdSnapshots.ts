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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberPostsPostIdSnapshots(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.from && { created_at: { gte: new Date(props.body.from) } }),
    ...(props.body.to && { created_at: { lte: new Date(props.body.to) } }),
  } satisfies Prisma.reddit_community_post_snapshotsWhereInput;
  const orderByInput = (
    props.body.sort === "vote_score"
      ? { vote_score: props.body.order === "asc" ? "asc" : "desc" }
      : props.body.sort === "comment_count"
        ? { comment_count: props.body.order === "asc" ? "asc" : "desc" }
        : { created_at: props.body.order === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.reddit_community_post_snapshotsOrderByWithRelationInput;
  await MyGlobal.prisma.reddit_community_posts.findUniqueOrThrow({
    where: { id: props.postId },
  });
  const data = await MyGlobal.prisma.reddit_community_post_snapshots.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_post_snapshots.count({
    where: whereInput,
  });
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
  };
}
