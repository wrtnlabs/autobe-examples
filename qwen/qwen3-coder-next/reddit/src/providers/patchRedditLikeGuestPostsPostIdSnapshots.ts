import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { RedditLikePostSnapshotAtSummaryTransformer } from "../transformers/RedditLikePostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeGuestPostsPostIdSnapshots(props: {
  guest: GuestPayload;
  postId: string;
  body: IRedditLikePostSnapshot.IRequest;
}): Promise<IPageIRedditLikePostSnapshot.ISummary> {
  const page = (props.body.page ?? 1) as number;
  const limit = (props.body.limit ?? 10) as number;
  const offset = (page - 1) * limit;
  const where = {
    post_id: props.postId,
  } satisfies Prisma.reddit_like_post_snapshotsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_post_snapshots.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { snapshot_created_at: "desc" },
      ...RedditLikePostSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_like_post_snapshots.count({ where }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    RedditLikePostSnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
