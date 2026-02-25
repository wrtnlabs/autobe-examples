import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformConfigurationTransformer } from "../transformers/CommunityPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformConfiguration> {
  const configuration =
    await MyGlobal.prisma.community_platform_configurations.findUniqueOrThrow({
      where: {
        id: props.configurationId,
        deleted_at: null,
      },
      ...CommunityPlatformConfigurationTransformer.select(),
    });
  return await CommunityPlatformConfigurationTransformer.transform(
    configuration,
  );
}
