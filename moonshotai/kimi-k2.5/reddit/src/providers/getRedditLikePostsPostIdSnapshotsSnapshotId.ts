import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditLikePostSnapshotTransformer } from "../transformers/RedditLikePostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditLikePostsPostIdSnapshotsSnapshotId(props: {
  postId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditLikePostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_like_post_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...RedditLikePostSnapshotTransformer.select(),
    });
  if (snapshot.post.id !== props.postId) {
    throw new HttpException(
      "Snapshot does not belong to the specified post",
      404,
    );
  }
  return await RedditLikePostSnapshotTransformer.transform(snapshot);
}
