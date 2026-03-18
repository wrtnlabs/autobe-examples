import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminPostsPostIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  postId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  if (snapshot.post_id !== props.postId) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
