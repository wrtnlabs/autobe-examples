import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformTempUpload";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformTempUploadAtSummaryTransformer } from "../transformers/CommunityPlatformTempUploadAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberTempUploads(props: {
  member: MemberPayload;
  body: ICommunityPlatformTempUpload.IRequest;
}): Promise<IPageICommunityPlatformTempUpload.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    deleted_at: null,
    // Only show uploads for the authenticated member
    community_platform_member_id: props.member.id,
    // Status filter
    ...(props.body.status !== undefined && {
      status: Array.isArray(props.body.status)
        ? { in: props.body.status }
        : props.body.status,
    }),
    // Uploader filter (redundant with member.id but included for completeness)
    ...(props.body.uploader_id !== undefined && {
      community_platform_member_id: props.body.uploader_id,
    }),
    // Filename filter (case-insensitive pattern matching)
    ...(props.body.original_filename !== undefined && {
      original_filename: {
        contains: props.body.original_filename,
        mode: "insensitive" as const,
      },
    }),
    // MIME type filter (exact match)
    ...(props.body.mime_type !== undefined && {
      mime_type: props.body.mime_type,
    }),
    // File size range filter
    ...((props.body.file_size_min !== undefined ||
      props.body.file_size_max !== undefined) && {
      file_size: {
        ...(props.body.file_size_min !== undefined && {
          gte: props.body.file_size_min,
        }),
        ...(props.body.file_size_max !== undefined && {
          lte: props.body.file_size_max,
        }),
      },
    }),
    // Content hash filter (exact match)
    ...(props.body.content_hash !== undefined && {
      content_hash: props.body.content_hash,
    }),
    // Expiration date range filter
    ...((props.body.expires_at_before !== undefined ||
      props.body.expires_at_after !== undefined) && {
      expires_at: {
        ...(props.body.expires_at_after !== undefined && {
          gte: new Date(props.body.expires_at_after),
        }),
        ...(props.body.expires_at_before !== undefined && {
          lte: new Date(props.body.expires_at_before),
        }),
      },
    }),
    // Creation date range filter
    ...((props.body.created_at_before !== undefined ||
      props.body.created_at_after !== undefined) && {
      created_at: {
        ...(props.body.created_at_after !== undefined && {
          gte: new Date(props.body.created_at_after),
        }),
        ...(props.body.created_at_before !== undefined && {
          lte: new Date(props.body.created_at_before),
        }),
      },
    }),
    // Search across filename and content hash
    ...(props.body.search !== undefined && {
      OR: [
        {
          original_filename: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          content_hash: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    }),
  } satisfies Prisma.community_platform_temp_uploadsWhereInput;
  // Apply sorting
  const orderByInput = (
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" as const, id: "asc" as const }
      : props.body.sort === "expires_at_asc"
        ? { expires_at: "asc" as const, id: "asc" as const }
        : props.body.sort === "expires_at_desc"
          ? { expires_at: "desc" as const, id: "desc" as const }
          : props.body.sort === "file_size_desc"
            ? { file_size: "desc" as const, id: "desc" as const }
            : props.body.sort === "original_filename_asc"
              ? { original_filename: "asc" as const, id: "asc" as const }
              : { created_at: "desc" as const, id: "desc" as const }
  ) satisfies Prisma.community_platform_temp_uploadsOrderByWithRelationInput; // default: created_at_desc
  // Fetch data and total count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.community_platform_temp_uploads.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformTempUploadAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.community_platform_temp_uploads.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    CommunityPlatformTempUploadAtSummaryTransformer.transform,
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
