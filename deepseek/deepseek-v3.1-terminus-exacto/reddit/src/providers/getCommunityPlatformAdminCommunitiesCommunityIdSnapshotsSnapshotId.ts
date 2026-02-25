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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserAtSummaryTransformer } from "../transformers/CommunityPlatformUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminCommunitiesCommunityIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_community_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          name: true,
          description: true,
          icon: true,
          created_at: true,
          snapshot_reason: true,
          community_platform_community_id: true,
          community: {
            select: {
              owner: CommunityPlatformUserAtSummaryTransformer.select(),
            },
          } satisfies Prisma.community_platform_communitiesFindManyArgs,
        },
      },
    );
  // Validate that the snapshot belongs to the specified community
  if (snapshot.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Snapshot does not belong to the specified community",
      404,
    );
  }
  return {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description ?? undefined,
    icon: snapshot.icon ?? undefined,
    owner: await CommunityPlatformUserAtSummaryTransformer.transform(
      snapshot.community.owner,
    ),
    created_at: snapshot.created_at.toISOString(),
    snapshot_reason: snapshot.snapshot_reason ?? null,
  };
}
