import { ICommunityPlatformSystemMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformSystemMetricCollector } from "../collectors/CommunityPlatformSystemMetricCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformSystemMetricAtSummaryTransformer } from "../transformers/CommunityPlatformSystemMetricAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformAdminSystemMetrics(props: {
  admin: AdminPayload;
  body: ICommunityPlatformSystemMetric.ICreate;
}): Promise<ICommunityPlatformSystemMetric> {
  const created =
    await MyGlobal.prisma.community_platform_system_metrics.create({
      data: await CommunityPlatformSystemMetricCollector.collect({
        body: props.body,
      }),
    });
  return await CommunityPlatformSystemMetricAtSummaryTransformer.transform(
    created,
  );
}
