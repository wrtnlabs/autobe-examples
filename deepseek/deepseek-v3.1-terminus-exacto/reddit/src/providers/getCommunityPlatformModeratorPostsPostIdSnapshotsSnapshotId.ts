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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { CommunityPlatformPostSnapshotTransformer } from "../transformers/CommunityPlatformPostSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorPostsPostIdSnapshotsSnapshotId(props: {
  moderator: ModeratorPayload;
  postId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostSnapshot> {
  // First verify the post exists and get its community context
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: { community_id: true },
    },
  );
  // Check if moderator has access to this community
  const moderatorAccess =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: post.community_id,
        user_id: props.moderator.id,
        is_active: true,
      },
    });
  if (!moderatorAccess) {
    throw new HttpException(
      "Moderator does not have access to this community",
      403,
    );
  }
  // Retrieve the snapshot with proper validation
  const snapshot =
    await MyGlobal.prisma.community_platform_post_snapshots.findUniqueOrThrow({
      where: {
        id: props.snapshotId,
        community_platform_post_id: props.postId,
      },
      ...CommunityPlatformPostSnapshotTransformer.select(),
    });
  return await CommunityPlatformPostSnapshotTransformer.transform(snapshot);
}
