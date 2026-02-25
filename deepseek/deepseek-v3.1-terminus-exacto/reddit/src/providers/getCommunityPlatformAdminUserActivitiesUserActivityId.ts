import { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { ICommunityPlatformUserActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserActivity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformUserActivityTransformer } from "../transformers/CommunityPlatformUserActivityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminUserActivitiesUserActivityId(props: {
  admin: AdminPayload;
  userActivityId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformUserActivity> {
  const activity =
    await MyGlobal.prisma.community_platform_user_activities.findUniqueOrThrow({
      where: { id: props.userActivityId },
      ...CommunityPlatformUserActivityTransformer.select(),
    });
  return await CommunityPlatformUserActivityTransformer.transform(activity);
}
