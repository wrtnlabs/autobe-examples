import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySnapshotTransformer } from "../transformers/CommunityPlatformCommunitySnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunitySlugSnapshotsSnapshotId(props: {
  communitySlug: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunitySnapshot> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        slug: props.communitySlug,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (community.status !== "active") {
    throw new HttpException("Not Found", 404);
  }
  const snapshot =
    await MyGlobal.prisma.community_platform_community_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.snapshotId,
          community_platform_community_id: community.id,
          deleted_at: null,
        },
        ...CommunityPlatformCommunitySnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformCommunitySnapshotTransformer.transform(
    snapshot,
  );
}
