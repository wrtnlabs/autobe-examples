import { ICommunityPlatformCommunityStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityStatisticTransformer } from "../transformers/CommunityPlatformCommunityStatisticTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformCommunitiesCommunityIdStatistics(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityStatistic> {
  // Verify the community exists first
  try {
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  } catch (error) {
    throw new HttpException(
      `Community with ID ${props.communityId} not found`,
      404,
    );
  }
  // Query the statistics table using unique constraint
  const statistics =
    await MyGlobal.prisma.community_platform_community_statistics.findUnique({
      where: {
        community_platform_community_id: props.communityId,
      },
      ...CommunityPlatformCommunityStatisticTransformer.select(),
    });
  // If no statistics record exists, throw 404 as per REST conventions
  if (statistics === null) {
    throw new HttpException(
      `Statistics for community with ID ${props.communityId} not found`,
      404,
    );
  }
  // Transform using the transformer - it handles date conversion properly
  return await CommunityPlatformCommunityStatisticTransformer.transform(
    statistics,
  );
}
