import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
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
import { CommunityPlatformCommunitySnapshotTransformer } from "../transformers/CommunityPlatformCommunitySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformModeratorCommunitiesCommunityIdSnapshotsSnapshotId(props: {
  moderator: ModeratorPayload;
  communityId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  // First validate that the snapshot exists and belongs to the specified community
  const snapshotValidation =
    await MyGlobal.prisma.community_platform_community_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        community_platform_community_id: props.communityId,
      },
      select: {
        id: true,
      },
    });
  if (!snapshotValidation) {
    throw new HttpException(
      "Community snapshot not found or does not belong to the specified community",
      404,
    );
  }
  // Then fetch the full snapshot data with the transformer
  const snapshot =
    await MyGlobal.prisma.community_platform_community_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
        },
        ...CommunityPlatformCommunitySnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformCommunitySnapshotTransformer.transform(
    snapshot,
  );
}
