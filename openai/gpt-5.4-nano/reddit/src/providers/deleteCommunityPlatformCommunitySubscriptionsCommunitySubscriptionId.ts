import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformCommunitySubscriptionsCommunitySubscriptionId(props: {
  communitySubscriptionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const nowIso = toISOStringSafe(new Date());
  await MyGlobal.prisma.$transaction(async (tx) => {
    const sub = await tx.community_platform_community_subscriptions.findUnique({
      where: { id: props.communitySubscriptionId },
      select: { id: true, member_id: true, is_active: true, deleted_at: true },
    });
    if (!sub) throw new HttpException("Not Found", 404);
    if (sub.deleted_at === null && sub.is_active) {
      await tx.community_platform_community_subscriptions.update({
        where: { id: props.communitySubscriptionId },
        data: {
          deleted_at: new Date(nowIso),
          is_active: false,
          updated_at: new Date(nowIso),
        },
      });
    }
  });
}
