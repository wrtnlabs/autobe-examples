import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformAdminAtSummaryTransformer } from "../transformers/CommunityPlatformAdminAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformAdmins(props: {
  body: ICommunityPlatformAdmin.IRequest;
}): Promise<IPageICommunityPlatformAdmin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause based on filter criteria
  const whereInput = {
    deleted_at: null, // Only non-deleted admins
    ...(props.body.email && { email: { contains: props.body.email } }),
    ...(props.body.display_name && {
      display_name: { contains: props.body.display_name },
    }),
    ...(props.body.permissions_level !== undefined && {
      permissions_level: props.body.permissions_level,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(props.body.last_login_at_start !== undefined &&
      props.body.last_login_at_start !== null && {
        last_login_at: { gte: new Date(props.body.last_login_at_start) },
      }),
    ...(props.body.last_login_at_end !== undefined &&
      props.body.last_login_at_end !== null && {
        last_login_at: { lte: new Date(props.body.last_login_at_end) },
      }),
    ...(props.body.created_at_start !== undefined &&
      props.body.created_at_start !== null && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
    ...(props.body.created_at_end !== undefined &&
      props.body.created_at_end !== null && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
    ...(props.body.updated_at_start !== undefined &&
      props.body.updated_at_start !== null && {
        updated_at: { gte: new Date(props.body.updated_at_start) },
      }),
    ...(props.body.updated_at_end !== undefined &&
      props.body.updated_at_end !== null && {
        updated_at: { lte: new Date(props.body.updated_at_end) },
      }),
  } satisfies Prisma.community_platform_adminsWhereInput;
  // Build ORDER BY clause
  const orderByInput = (
    props.body.sort_by === "last_login_at"
      ? { last_login_at: props.body.sort_order || "desc" }
      : props.body.sort_by === "display_name"
        ? { display_name: props.body.sort_order || "asc" }
        : { created_at: props.body.sort_order || "desc" }
  ) satisfies Prisma.community_platform_adminsOrderByWithRelationInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_admins.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformAdminAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_admins.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformAdminAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
