import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformModerationReportsResolution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationReportsResolution";
import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformModerationReportsResolutionTransformer } from "../transformers/CommunityPlatformModerationReportsResolutionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminResolutionsResolutionId(props: {
  admin: AdminPayload;
  resolutionId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformModerationReportsResolution> {
  const resolution =
    await MyGlobal.prisma.community_platform_moderation_reports_resolutions.findUnique(
      {
        where: { id: props.resolutionId },
        ...CommunityPlatformModerationReportsResolutionTransformer.select(),
      },
    );
  if (!resolution) {
    throw new HttpException("Resolution not found", 404);
  }
  return await CommunityPlatformModerationReportsResolutionTransformer.transform(
    resolution,
  );
}
