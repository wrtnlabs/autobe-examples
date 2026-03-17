import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformFileAtSummaryTransformer } from "../transformers/CommunityPlatformFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformFiles(props: {
  body: ICommunityPlatformFile.IRequest;
}): Promise<IPageICommunityPlatformFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      name: { contains: props.body.search, mode: Prisma.QueryMode.insensitive },
    }),
    ...(props.body.type && { type: props.body.type }),
    ...(props.body.size_min !== undefined &&
      props.body.size_max !== undefined && {
        size: { gte: props.body.size_min, lte: props.body.size_max },
      }),
    ...(props.body.size_min !== undefined &&
      props.body.size_max === undefined && {
        size: { gte: props.body.size_min },
      }),
    ...(props.body.size_min === undefined &&
      props.body.size_max !== undefined && {
        size: { lte: props.body.size_max },
      }),
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.actor_type && { actor_type: props.body.actor_type }),
    ...(props.body.actor_id && { actor_id: props.body.actor_id }),
    ...(props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: {
          gte: new Date(props.body.created_at_start),
          lte: new Date(props.body.created_at_end),
        },
      }),
    ...(props.body.created_at_start &&
      !props.body.created_at_end && {
        created_at: { gte: new Date(props.body.created_at_start) },
      }),
    ...(!props.body.created_at_start &&
      props.body.created_at_end && {
        created_at: { lte: new Date(props.body.created_at_end) },
      }),
    ...(props.body.updated_at_start &&
      props.body.updated_at_end && {
        updated_at: {
          gte: new Date(props.body.updated_at_start),
          lte: new Date(props.body.updated_at_end),
        },
      }),
    ...(props.body.updated_at_start &&
      !props.body.updated_at_end && {
        updated_at: { gte: new Date(props.body.updated_at_start) },
      }),
    ...(!props.body.updated_at_start &&
      props.body.updated_at_end && {
        updated_at: { lte: new Date(props.body.updated_at_end) },
      }),
  } satisfies Prisma.community_platform_filesWhereInput;
  const orderByInput = {
    created_at: "desc" as const,
  } satisfies Prisma.community_platform_filesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.community_platform_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...CommunityPlatformFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_files.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
