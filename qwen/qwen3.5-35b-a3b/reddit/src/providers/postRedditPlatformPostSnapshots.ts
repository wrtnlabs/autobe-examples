import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostSnapshotCollector } from "../collectors/RedditPlatformPostSnapshotCollector";
import { RedditPlatformPostSnapshotTransformer } from "../transformers/RedditPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformPostSnapshots(props: {
  body: IRedditPlatformPostSnapshot.ICreate;
  redditPlatformPosts: IEntity;
  redditPlatformMembers: IEntity;
}): Promise<IRedditPlatformPostSnapshot> {
  const created = await MyGlobal.prisma.reddit_platform_post_snapshots.create({
    data: await RedditPlatformPostSnapshotCollector.collect({
      body: props.body,
      redditPlatformPosts: props.redditPlatformPosts,
      redditPlatformMembers: props.redditPlatformMembers,
    }),
    select: RedditPlatformPostSnapshotTransformer.select().select,
  });
  return await RedditPlatformPostSnapshotTransformer.transform(created);
}
