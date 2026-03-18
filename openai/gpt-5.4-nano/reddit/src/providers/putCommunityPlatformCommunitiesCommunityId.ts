import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: { id: props.communityId },
  });
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        community_owner_id: true,
        deleted_at: true,
        name: true,
        description: true,
        icon_href: true,
        owner: { select: { id: true } },
      },
    });
  const actorId = (
    props as unknown as {
      customer?: {
        id?: string;
      };
    }
  ).customer?.id;
  if (actorId && community.community_owner_id !== actorId) {
    const moderator =
      await MyGlobal.prisma.community_platform_community_moderators.findFirst({
        where: {
          community_id: props.communityId,
          member_id: actorId,
          deleted_at: null,
        } as any,
        select: { id: true },
      });
    if (!moderator) throw new HttpException("Forbidden", 403);
  }
  const updates: {
    name?: string;
    description?: string;
    icon_href?: string;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
    ...(props.body.name !== undefined ? { name: props.body.name } : {}),
    ...(props.body.description !== undefined
      ? { description: props.body.description }
      : {}),
    ...(props.body.icon_href !== undefined
      ? { icon_href: props.body.icon_href }
      : {}),
  };
  if (props.body.name !== undefined) {
    const conflict =
      await MyGlobal.prisma.community_platform_communities.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.communityId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (conflict) throw new HttpException("Community name already exists", 409);
  }
  await MyGlobal.prisma.community_platform_communities.update({
    where: { id: props.communityId },
    data: updates as any,
  });
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
