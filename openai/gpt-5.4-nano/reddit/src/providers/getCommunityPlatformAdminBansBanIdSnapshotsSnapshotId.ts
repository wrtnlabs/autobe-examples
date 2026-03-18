import { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformCommunityBanSnapshotTransformer } from "../transformers/CommunityPlatformCommunityBanSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminBansBanIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBanSnapshot> {
  const admin = await MyGlobal.prisma.community_platform_admins.findFirst({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (admin === null) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshot =
    await MyGlobal.prisma.community_platform_community_ban_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...CommunityPlatformCommunityBanSnapshotTransformer.select(),
      },
    );
  if (snapshot.community_ban_id !== props.banId) {
    throw new HttpException("Not Found", 404);
  }
  return await CommunityPlatformCommunityBanSnapshotTransformer.transform(
    snapshot,
  );
}
