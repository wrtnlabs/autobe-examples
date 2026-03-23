import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBan";
import { IRedditCloneBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanSnapshot";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneBanSnapshotTransformer } from "../transformers/RedditCloneBanSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneBanSnapshotsSnapshotId(props: {
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneBanSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_clone_ban_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...RedditCloneBanSnapshotTransformer.select(),
    });
  return await RedditCloneBanSnapshotTransformer.transform(snapshot);
}
