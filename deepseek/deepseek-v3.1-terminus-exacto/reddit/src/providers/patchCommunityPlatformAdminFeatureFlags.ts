import { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFeatureFlag";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformFeatureFlagAtSummaryTransformer } from "../transformers/CommunityPlatformFeatureFlagAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminFeatureFlags(props: {
  admin: AdminPayload;
  body: ICommunityPlatformFeatureFlag.IRequest;
}): Promise<IPageICommunityPlatformFeatureFlag.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 20), 100);
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper type safety
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.flag_type && {
      flag_type: typia.assert<"boolean" | "percentage" | "user_specific">(
        props.body.flag_type,
      ),
    }),
    ...(props.body.status && {
      status: typia.assert<"active" | "inactive" | "archived">(
        props.body.status,
      ),
    }),
  } satisfies Prisma.community_platform_feature_flagsWhereInput;
  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_feature_flags.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformFeatureFlagAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_feature_flags.count({
      where: whereInput,
    }),
  ]);
  // Transform results using async map
  const transformed = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformFeatureFlagAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit) || 0,
    } satisfies IPage.IPagination,
  };
}
