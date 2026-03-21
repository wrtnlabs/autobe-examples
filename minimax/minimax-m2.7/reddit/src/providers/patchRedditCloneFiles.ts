import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneFile";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneFileAtSummaryTransformer } from "../transformers/RedditCloneFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneFiles(props: {
  body: IRedditCloneFile.IRequest;
}): Promise<IPageIRedditCloneFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with filters
  const whereInput: Prisma.reddit_clone_filesWhereInput = {
    deleted_at: null,
    ...(props.body.filename !== undefined && {
      original_filename: {
        contains: props.body.filename,
        mode: "insensitive",
      },
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.mimeType !== undefined && {
      mime_type: props.body.mimeType,
    }),
    ...(props.body.uploaderId !== undefined && {
      uploader_id: props.body.uploaderId,
    }),
    ...(props.body.createdAfter !== undefined ||
    props.body.createdBefore !== undefined
      ? {
          created_at: {
            ...(props.body.createdAfter !== undefined && {
              gte: new Date(props.body.createdAfter),
            }),
            ...(props.body.createdBefore !== undefined && {
              lte: new Date(props.body.createdBefore),
            }),
          },
        }
      : {}),
  };
  // Build ORDER BY clause
  const orderByInput: Prisma.reddit_clone_filesOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "originalFilename":
          return { original_filename: props.body.order ?? "desc" };
        case "fileSize":
          return { file_size: props.body.order ?? "desc" };
        case "mimeType":
          return { mime_type: props.body.order ?? "desc" };
        case "status":
          return { status: props.body.order ?? "desc" };
        case "createdAt":
        default:
          return { created_at: props.body.order ?? "desc" };
      }
    })();
  // Query files with transformer select
  const files = await MyGlobal.prisma.reddit_clone_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneFileAtSummaryTransformer.select(),
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.reddit_clone_files.count({
    where: whereInput,
  });
  // Transform results
  const data = await ArrayUtil.asyncMap(
    files,
    RedditCloneFileAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  };
}
