import { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityModeratorAnalyticsCommunities(props: {
  moderator: ModeratorPayload;
}): Promise<ICommunityPlatformMetadatum> {
  const activeCommunityCount =
    await MyGlobal.prisma.community_communities.count();
  const totalSubscriberCount =
    await MyGlobal.prisma.community_subscriptions.count();
  return {
    activeCommunityCount,
    totalSubscriberCount,
    createdAt: toISOStringSafe(new Date()),
    updatedAt: toISOStringSafe(new Date()),
  };
}
