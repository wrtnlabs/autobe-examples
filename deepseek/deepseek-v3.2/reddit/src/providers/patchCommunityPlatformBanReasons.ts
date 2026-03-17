import { ICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBanReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformBanReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformBanReason";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformBanReasonAtSummaryTransformer } from "../transformers/CommunityPlatformBanReasonAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformBanReasons(props: {
  body: ICommunityPlatformBanReason.IRequest;
}): Promise<IPageICommunityPlatformBanReason.ISummary> {
  // 1. Parse pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 2. Build WHERE clause
  const whereInput = {
    deleted_at: null, // Only non-deleted records
    ...(props.body.active !== undefined && props.body.active !== null
      ? { active: props.body.active }
      : {}),
    ...(props.body.severity && {
      severity: props.body.severity,
    }),
    ...(props.body.search && {
      OR: [
        // Use trigram similarity search as per specification
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.community_platform_ban_reasonsWhereInput;
  // 3. Build ORDER BY with proper typing
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder =
    props.body.sortOrder ?? (sortBy === "created_at" ? "desc" : "asc");
  const orderByInput = (
    sortBy === "severity"
      ? { severity: sortOrder }
      : sortBy === "title"
        ? { title: sortOrder }
        : { created_at: sortOrder }
  ) satisfies Prisma.community_platform_ban_reasonsOrderByWithRelationInput;
  // 4. Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_ban_reasons.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...CommunityPlatformBanReasonAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_ban_reasons.count({
      where: whereInput,
    }),
  ]);
  // 5. Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformBanReasonAtSummaryTransformer.transform,
  );
  // 6. Return paginated response
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
