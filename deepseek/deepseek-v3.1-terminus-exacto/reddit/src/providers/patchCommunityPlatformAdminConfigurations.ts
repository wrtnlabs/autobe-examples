import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformConfigurationAtSummaryTransformer } from "../transformers/CommunityPlatformConfigurationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminConfigurations(props: {
  admin: AdminPayload;
  body: ICommunityPlatformConfiguration.IRequest;
}): Promise<IPageICommunityPlatformConfiguration.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      config_key: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.data_type && { data_type: props.body.data_type }),
    ...(props.body.scope && { scope: props.body.scope }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
  } satisfies Prisma.community_platform_configurationsWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_configurations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...CommunityPlatformConfigurationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_configurations.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformConfigurationAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
