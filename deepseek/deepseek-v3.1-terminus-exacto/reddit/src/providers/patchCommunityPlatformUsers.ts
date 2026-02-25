import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformUserAtSummaryTransformer } from "../transformers/CommunityPlatformUserAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUsers(props: {
  body: ICommunityPlatformUser.IRequest;
}): Promise<IPageICommunityPlatformUser.ISummary> {
  // Authorization check - verify admin privileges
  // TODO: Implement proper admin authorization check based on actor context
  // For now, we'll assume authorization is handled at the controller level
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE conditions
  const whereInput: Prisma.community_platform_usersWhereInput = {
    deleted_at: null, // Exclude soft-deleted users
    ...(props.body.username && {
      username: { contains: props.body.username, mode: "insensitive" },
    }),
    ...(props.body.email && {
      email: { contains: props.body.email, mode: "insensitive" },
    }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name, mode: "insensitive" },
    }),
    ...(props.body.bio && {
      bio: { contains: props.body.bio, mode: "insensitive" },
    }),
    ...(props.body.avatar_url && {
      avatar_url: { contains: props.body.avatar_url },
    }),
    ...(props.body.karma_min !== undefined && {
      karma: { gte: props.body.karma_min },
    }),
    ...(props.body.karma_max !== undefined && {
      karma: { lte: props.body.karma_max },
    }),
    ...(props.body.email_verified !== undefined && {
      email_verified: props.body.email_verified,
    }),
    ...(props.body.created_after && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before && {
      created_at: { lte: props.body.created_before },
    }),
  };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_users.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityPlatformUserAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_users.count({
      where: whereInput,
    }),
  ]);
  // Transform data
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformUserAtSummaryTransformer.transform,
  );
  // Calculate pages, handling division by zero
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  };
}
