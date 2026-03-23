import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditLikePostSnapshotTransformer } from "../transformers/RedditLikePostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikeMemberPostsPostIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  postId: string;
  snapshotId: string;
}): Promise<IRedditLikePostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_like_post_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      ...RedditLikePostSnapshotTransformer.select(),
    });
  return await RedditLikePostSnapshotTransformer.transform(snapshot);
}
