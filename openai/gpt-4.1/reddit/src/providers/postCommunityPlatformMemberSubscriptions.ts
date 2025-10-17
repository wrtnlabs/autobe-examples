import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.ICreate;
}): Promise<ICommunityPlatformSubscription> {
  // 1. Validate community existence and status
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        id: props.body.community_id,
        deleted_at: null,
        status: "active",
      },
      select: {
        id: true,
      },
    });
  if (!community) {
    throw new HttpException(
      "Target community does not exist or is not active.",
      404,
    );
  }

  // 2. Check if user is banned in this community
  const ban = await MyGlobal.prisma.community_platform_ban_histories.findFirst({
    where: {
      banned_member_id: props.member.id,
      community_id: props.body.community_id,
      is_active: true,
    },
    select: { id: true },
  });
  if (ban) {
    throw new HttpException(
      "You are banned from subscribing to this community.",
      403,
    );
  }

  // 3. Check duplicate subscription (active only)
  const existing =
    await MyGlobal.prisma.community_platform_subscriptions.findFirst({
      where: {
        member_id: props.member.id,
        community_id: props.body.community_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existing) {
    throw new HttpException("Already subscribed to this community.", 409);
  }

  // 4. Enforce subscription quota (system config key: 'max_member_subscriptions')
  const quotaCfg =
    await MyGlobal.prisma.community_platform_system_configs.findUnique({
      where: { key: "max_member_subscriptions" },
      select: { value: true },
    });
  let quota = 100; // Default
  if (quotaCfg && !isNaN(Number(quotaCfg.value)))
    quota = Number(quotaCfg.value);
  const activeCount =
    await MyGlobal.prisma.community_platform_subscriptions.count({
      where: { member_id: props.member.id, deleted_at: null },
    });
  if (activeCount >= quota) {
    throw new HttpException("Subscription limit reached.", 403);
  }

  // 5. Create subscription
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_platform_subscriptions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: props.member.id,
        community_id: props.body.community_id,
        created_at: now,
        deleted_at: null,
      },
    },
  );

  return {
    id: created.id,
    member_id: created.member_id,
    community_id: created.community_id,
    created_at: toISOStringSafe(created.created_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
