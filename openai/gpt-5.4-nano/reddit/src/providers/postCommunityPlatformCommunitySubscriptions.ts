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

export async function postCommunityPlatformCommunitySubscriptions(props: {
  body: ICommunityPlatformCommunitySubscription.ICreate;
}): Promise<ICommunityPlatformCommunitySubscription> {
  const now: globalThis.Date = new globalThis.Date();
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.body.community_id },
      select: { id: true },
    });
  // Derive authenticated member from session context that the platform wiring provides.
  // The operation runtime supplies an authenticated entity as `props.member`.
  const member = (
    props as unknown as {
      member: IEntity;
    }
  ).member;
  try {
    const created =
      await MyGlobal.prisma.community_platform_community_subscriptions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          subscribed_at: now,
          is_active: true,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          community: { connect: { id: community.id } },
          member: { connect: { id: member.id } },
        },
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
      });
    return {
      id: created.id,
      community_id: created.community_id,
      member_id: created.member_id,
      subscribed_at: created.subscribed_at.toISOString(),
      is_active: created.is_active,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      deleted_at: created.deleted_at?.toISOString() ?? null,
    };
  } catch (e: unknown) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      throw new HttpException("already subscribed", 400);
    }
    throw e;
  }
}
