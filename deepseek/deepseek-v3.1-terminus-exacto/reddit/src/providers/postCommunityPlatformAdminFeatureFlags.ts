import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFeatureFlagCollector } from "../collectors/CommunityPlatformFeatureFlagCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagTransformer } from "../transformers/CommunityPlatformFeatureFlagTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: ICommunityPlatformFeatureFlag.ICreate;
}): Promise<ICommunityPlatformFeatureFlag> {
  try {
    const createdFlag =
      await MyGlobal.prisma.community_platform_feature_flags.create({
        data: await CommunityPlatformFeatureFlagCollector.collect({
          body: props.body,
        }),
        ...CommunityPlatformFeatureFlagTransformer.select(),
      });
    return await CommunityPlatformFeatureFlagTransformer.transform(createdFlag);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Feature flag name already exists", 400);
    }
    throw error;
  }
}
