import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformPostSnapshotTransformer } from "../transformers/RedditPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformPostSnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformPostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_platform_post_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...RedditPlatformPostSnapshotTransformer.select(),
    });
  return await RedditPlatformPostSnapshotTransformer.transform(snapshot);
}
