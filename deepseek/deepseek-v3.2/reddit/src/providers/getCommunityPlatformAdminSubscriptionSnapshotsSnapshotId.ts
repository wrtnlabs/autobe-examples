import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { ICommunityPlatformSubscriptionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscriptionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSubscriptionSnapshotTransformer } from "../transformers/CommunityPlatformSubscriptionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminSubscriptionSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_subscription_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...CommunityPlatformSubscriptionSnapshotTransformer.select(),
      },
    );
  return await CommunityPlatformSubscriptionSnapshotTransformer.transform(
    snapshot,
  );
}
