import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityFile";
import { IRedditCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityFiles(props: {
  body: IRedditCommunityFile.IRequest;
}): Promise<IPageIRedditCommunityFile.ISummary> {
  const page_size = props.body.page_size ?? 20;
  const validated_page_size =
    page_size < 1 ? 1 : page_size > 100 ? 100 : page_size;
  const cursor = props.body.cursor;
  const offset_page = props.body.page;
  const offset_limit = props.body.limit ?? 100;
  const use_cursor = cursor !== undefined;
  const use_offset = offset_page !== undefined && offset_page !== null;
  const where_conditions: Prisma.reddit_community_filesWhereInput = {
    deleted_at: null,
    ...(props.body.file_type !== undefined && {
      file_type: props.body.file_type,
    }),
    ...(props.body.mime_type !== undefined && {
      mime_type: props.body.mime_type,
    }),
    ...(props.body.created_after !== undefined && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: props.body.created_before },
    }),
    ...(props.body.min_file_size !== undefined && {
      file_size: { gte: props.body.min_file_size },
    }),
    ...(props.body.max_file_size !== undefined && {
      file_size: { lte: props.body.max_file_size },
    }),
  } satisfies Prisma.reddit_community_filesWhereInput;
  const sort_by = props.body.sort_by ?? "created_at";
  const sort_order = props.body.sort_order ?? "desc";
  const order_field = sort_by === "created_at" ? "created_at" : "file_size";
  const order_by_input = {
    [order_field]: sort_order,
  } satisfies Prisma.reddit_community_filesOrderByWithRelationInput;
  let data: Array<{
    id: string;
    file_type: string;
    mime_type: string;
    file_path: string;
    file_size: number | null;
    created_at: Date;
  }>;
  let pagination: {
    current: number;
    limit: number;
    records: number;
    pages: number;
    cursor?: string;
  };
  if (use_cursor) {
    const parts = cursor.split("|");
    const sort_key_value = parts[0];
    const lastRecordWhere: Prisma.reddit_community_filesWhereInput = {
      ...where_conditions,
      ...(order_field === "created_at"
        ? {
            created_at: {
              lt: sort_key_value as string & tags.Format<"date-time">,
            },
          }
        : { file_size: { lt: parseInt(sort_key_value, 10) } }),
    } satisfies Prisma.reddit_community_filesWhereInput;
    data = (await MyGlobal.prisma.reddit_community_files.findMany({
      where: lastRecordWhere,
      orderBy: order_by_input,
      take: validated_page_size,
      select: {
        id: true,
        file_type: true,
        mime_type: true,
        file_path: true,
        file_size: true,
        created_at: true,
      },
    })) satisfies Array<{
      id: string;
      file_type: string;
      mime_type: string;
      file_path: string;
      file_size: number | null;
      created_at: Date;
    }>;
    const total = await MyGlobal.prisma.reddit_community_files.count({
      where: where_conditions,
    });
    pagination = {
      current: 1,
      limit: validated_page_size,
      records: total,
      pages: Math.ceil(total / validated_page_size),
    };
  } else if (use_offset) {
    const skip = ((offset_page ?? 1) - 1) * offset_limit;
    data = (await MyGlobal.prisma.reddit_community_files.findMany({
      where: where_conditions,
      orderBy: order_by_input,
      skip,
      take: offset_limit,
      select: {
        id: true,
        file_type: true,
        mime_type: true,
        file_path: true,
        file_size: true,
        created_at: true,
      },
    })) satisfies Array<{
      id: string;
      file_type: string;
      mime_type: string;
      file_path: string;
      file_size: number | null;
      created_at: Date;
    }>;
    const total = await MyGlobal.prisma.reddit_community_files.count({
      where: where_conditions,
    });
    pagination = {
      current: offset_page ?? 1,
      limit: offset_limit,
      records: total,
      pages: Math.ceil(total / offset_limit),
    };
  } else {
    data = (await MyGlobal.prisma.reddit_community_files.findMany({
      where: where_conditions,
      orderBy: order_by_input,
      take: validated_page_size,
      select: {
        id: true,
        file_type: true,
        mime_type: true,
        file_path: true,
        file_size: true,
        created_at: true,
      },
    })) satisfies Array<{
      id: string;
      file_type: string;
      mime_type: string;
      file_path: string;
      file_size: number | null;
      created_at: Date;
    }>;
    const total = await MyGlobal.prisma.reddit_community_files.count({
      where: where_conditions,
    });
    pagination = {
      current: 1,
      limit: validated_page_size,
      records: total,
      pages: Math.ceil(total / validated_page_size),
    };
  }
  const transformed_data: IRedditCommunityFile.ISummary[] = data.map(
    (record) => ({
      id: record.id,
      fileType: record.file_type as
        | "user_avatar"
        | "post_image"
        | "community_icon",
      mimeType: record.mime_type,
      filePath: record.file_path,
      fileSize: record.file_size ?? undefined,
      createdAt: toISOStringSafe(record.created_at),
    }),
  );
  return {
    pagination: pagination,
    data: transformed_data,
  };
}
