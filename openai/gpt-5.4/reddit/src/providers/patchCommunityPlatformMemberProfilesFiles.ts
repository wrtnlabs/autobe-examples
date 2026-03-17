import { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformProfileFileAtSummaryTransformer } from "../transformers/CommunityPlatformProfileFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberProfilesFiles(props: {
  member: MemberPayload;
  body: ICommunityPlatformProfileFile.IRequest;
}): Promise<IPageICommunityPlatformProfileFile.ISummary> {
  if (
    props.body.size_min !== undefined &&
    props.body.size_max !== undefined &&
    props.body.size_min > props.body.size_max
  ) {
    throw new HttpException("Invalid size range", 400);
  }
  const profile =
    await MyGlobal.prisma.community_platform_profiles.findFirstOrThrow({
      where: {
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    community_platform_profile_id: profile.id,
    deleted_at: null,
    ...(props.body.category !== undefined
      ? {
          category: props.body.category,
        }
      : {}),
    ...(props.body.original_name !== undefined
      ? {
          original_name: props.body.original_name,
        }
      : {}),
    ...(props.body.extension !== undefined
      ? {
          extension: props.body.extension,
        }
      : {}),
    ...(props.body.mime_type !== undefined
      ? {
          mime_type: props.body.mime_type,
        }
      : {}),
    ...(props.body.size_min !== undefined || props.body.size_max !== undefined
      ? {
          size: {
            ...(props.body.size_min !== undefined
              ? {
                  gte: props.body.size_min,
                }
              : {}),
            ...(props.body.size_max !== undefined
              ? {
                  lte: props.body.size_max,
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined
              ? {
                  gte: new Date(props.body.created_at_from),
                }
              : {}),
            ...(props.body.created_at_to !== undefined
              ? {
                  lte: new Date(props.body.created_at_to),
                }
              : {}),
          },
        }
      : {}),
    ...(props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(props.body.updated_at_from !== undefined
              ? {
                  gte: new Date(props.body.updated_at_from),
                }
              : {}),
            ...(props.body.updated_at_to !== undefined
              ? {
                  lte: new Date(props.body.updated_at_to),
                }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_platform_profile_filesWhereInput;
  const orderBy: Prisma.community_platform_profile_filesOrderByWithRelationInput[] =
    props.body.sort === "created_at+asc"
      ? [{ created_at: "asc" }, { id: "asc" }]
      : props.body.sort === "updated_at+asc"
        ? [{ updated_at: "asc" }, { id: "asc" }]
        : props.body.sort === "updated_at+desc"
          ? [{ updated_at: "desc" }, { id: "desc" }]
          : props.body.sort === "size+asc"
            ? [{ size: "asc" }, { id: "asc" }]
            : props.body.sort === "size+desc"
              ? [{ size: "desc" }, { id: "desc" }]
              : props.body.sort === "original_name+asc"
                ? [{ original_name: "asc" }, { id: "asc" }]
                : props.body.sort === "original_name+desc"
                  ? [{ original_name: "desc" }, { id: "desc" }]
                  : [{ created_at: "desc" }, { id: "desc" }];
  const data = await MyGlobal.prisma.community_platform_profile_files.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...CommunityPlatformProfileFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.community_platform_profile_files.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      CommunityPlatformProfileFileAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
