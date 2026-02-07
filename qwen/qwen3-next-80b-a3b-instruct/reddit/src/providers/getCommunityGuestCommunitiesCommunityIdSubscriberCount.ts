import { ICommunityCommunityActor } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunityActor";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityGuestCommunitiesCommunityIdSubscriberCount(props: {
  guest: GuestPayload;
  communityId: string;
}): Promise<ICommunityCommunityActor> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId },
    select: {
      id: true,
      created_at: true,
    },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  return {
    id: community.id,
    created_at: toISOStringSafe(community.created_at),
  };
}
