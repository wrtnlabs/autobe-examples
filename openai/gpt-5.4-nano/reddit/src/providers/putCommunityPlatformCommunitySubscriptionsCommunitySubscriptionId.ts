import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
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

export async function putCommunityPlatformCommunitySubscriptionsCommunitySubscriptionId(props: {
  communitySubscriptionId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunitySubscription.IUpdate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const existing =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.communitySubscriptionId },
        select: {
          id: true,
          community_id: true,
          member_id: true,
          subscribed_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  const actor = (
    MyGlobal as unknown as {
      actor?: IEntity & {
        session_id?: string;
      };
    }
  ).actor;
  const actorId = actor?.id ?? null;
  const actorKind =
    (
      actor as unknown as {
        kind?: string;
      }
    )?.kind ?? null;
  if (actorKind === "guest") {
    throw new HttpException("Forbidden", 403);
  }
  if (actorKind === "member" && actorId !== existing.member_id) {
    throw new HttpException("Forbidden", 403);
  }
  const nextIsActive = props.body.is_active ?? existing.is_active;
  const isActiveChanged =
    props.body.is_active !== undefined && nextIsActive !== existing.is_active;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.community_platform_community_subscriptions.update({
      where: { id: existing.id },
      data: {
        ...(isActiveChanged ? { is_active: nextIsActive } : {}),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.community_platform_community_subscriptions.findUniqueOrThrow(
      {
        where: { id: props.communitySubscriptionId },
        select: {
          id: true,
          community_id: true,
          member_id: true,
          subscribed_at: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  return {
    id: updated.id,
    community_id: updated.community_id,
    member_id: updated.member_id,
    subscribed_at: toISOStringSafe(updated.subscribed_at),
    is_active: updated.is_active,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
