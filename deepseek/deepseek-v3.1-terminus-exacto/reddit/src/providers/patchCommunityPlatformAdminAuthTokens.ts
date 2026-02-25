import { ICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAuthToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAuthToken";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformAuthTokenAtSummaryTransformer } from "../transformers/CommunityPlatformAuthTokenAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdminAuthTokens(props: {
  admin: AdminPayload;
  body: ICommunityPlatformAuthToken.IRequest;
}): Promise<IPageICommunityPlatformAuthToken.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions with proper date handling
  const whereInput = {
    ...(props.body.token_type && { token_type: props.body.token_type }),
    ...(props.body.expires_at_before && {
      expires_at: { lt: new Date(props.body.expires_at_before) },
    }),
    ...(props.body.expires_at_after && {
      expires_at: { gt: new Date(props.body.expires_at_after) },
    }),
    ...(props.body.used_at === "unused" && { used_at: null }),
    ...(props.body.used_at === "used" && { used_at: { not: null } }),
    ...(props.body.created_at_before && {
      created_at: { lt: new Date(props.body.created_at_before) },
    }),
    ...(props.body.created_at_after && {
      created_at: { gt: new Date(props.body.created_at_after) },
    }),
    ...(props.body.deleted_at === "active" && { deleted_at: null }),
    ...(props.body.deleted_at === "deleted" && { deleted_at: { not: null } }),
  } satisfies Prisma.community_platform_auth_tokensWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_auth_tokens.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformAuthTokenAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_auth_tokens.count({
      where: whereInput,
    }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformAuthTokenAtSummaryTransformer.transform,
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
