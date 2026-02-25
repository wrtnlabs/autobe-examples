import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import { IRedditProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditProfileSnapshotTransformer } from "../transformers/RedditProfileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditMemberCommentsCommentIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditProfileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_comment_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        reddit_comment_id: props.commentId,
        deleted_at: null,
      },
      ...RedditProfileSnapshotTransformer.select(),
    });
  return await RedditProfileSnapshotTransformer.transform(snapshot);
}
