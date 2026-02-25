import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
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
  // Admin authorization already validated via AdminAuth decorator
  // Query snapshot with composite condition to ensure it belongs to specified post
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        community_platform_post_id: props.postId,
      },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  // Transform database record to API response using transformer
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
