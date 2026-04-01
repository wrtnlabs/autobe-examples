import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityFileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityFileSnapshotTransformer } from "../transformers/RedditCommunityFileSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCommunityMemberFilesFileIdSnapshotsSnapshotId(props: {
  member: MemberPayload;
  fileId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IRedditCommunityFileSnapshot> {
  const snapshot =
    await MyGlobal.prisma.reddit_community_file_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
      },
      select: {
        id: true,
        snapshot_created_at: true,
        created_at: true,
        updated_at: true,
        reddit_community_file_id: true,
      },
    });
  return await RedditCommunityFileSnapshotTransformer.transform({
    ...snapshot,
    file: { id: snapshot.reddit_community_file_id },
  });
}
