import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import { IRedditClonePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostSnapshot";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditClonePostSnapshotCollector } from "../collectors/RedditClonePostSnapshotCollector";
import { RedditClonePostSnapshotTransformer } from "../transformers/RedditClonePostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditClonePostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditClonePostSnapshot.ICreate;
}): Promise<IRedditClonePostSnapshot> {
  const record = await MyGlobal.prisma.reddit_clone_post_snapshots.create({
    data: await RedditClonePostSnapshotCollector.collect({
      body: props.body,
      redditClonePosts: { id: props.postId },
    }),
    ...RedditClonePostSnapshotTransformer.select(),
  });
  return await RedditClonePostSnapshotTransformer.transform(record);
}
