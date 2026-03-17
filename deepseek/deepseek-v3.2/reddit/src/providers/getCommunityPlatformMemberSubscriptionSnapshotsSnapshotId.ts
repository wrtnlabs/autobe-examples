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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformSubscriptionSnapshotTransformer } from "../transformers/CommunityPlatformSubscriptionSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberSubscriptionSnapshotsSnapshotId(props: {
  member: MemberPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformSubscriptionSnapshot> {
  const snapshot =
    await MyGlobal.prisma.community_platform_subscription_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        ...CommunityPlatformSubscriptionSnapshotTransformer.select(),
      },
    );
  if (snapshot.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await CommunityPlatformSubscriptionSnapshotTransformer.transform(
    snapshot,
  );
}
