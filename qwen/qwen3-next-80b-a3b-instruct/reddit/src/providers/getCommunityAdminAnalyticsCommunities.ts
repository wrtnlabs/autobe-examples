import { ICommunityUsageMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityUsageMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityAdminAnalyticsCommunities(props: {
  admin: AdminPayload;
}): Promise<ICommunityUsageMetric> {
  const activeCommunityCount =
    await MyGlobal.prisma.community_communities.count();
  const totalSubscriberCount =
    await MyGlobal.prisma.community_subscriptions.count();
  return {
    activeCommunityCount,
    totalSubscriberCount,
  };
}
