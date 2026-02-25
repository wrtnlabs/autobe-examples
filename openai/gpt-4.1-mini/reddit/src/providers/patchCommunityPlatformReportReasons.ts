import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportReason";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformReportReasons(props: {
  body: ICommunityPlatformReportReason.IRequest;
}): Promise<IPageICommunityPlatformReportReason.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (!(Number.isInteger(page) && page >= 1)) {
    throw new HttpException("Invalid page number", 400);
  }
  if (!(Number.isInteger(limit) && limit >= 1 && limit <= 100)) {
    throw new HttpException("Invalid limit number", 400);
  }
  const where = props.body.search
    ? {
        reason_text: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }
    : {};
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.community_platform_report_reasons.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { reason_text: "asc" },
    },
  );
  const total = await MyGlobal.prisma.community_platform_report_reasons.count({
    where,
  });
  return {
    data: data.map((r) => ({
      id: r.id as string & tags.Format<"uuid">,
      reasonText: r.reason_text,
      createdAt: toISOStringSafe(r.created_at),
      updatedAt: toISOStringSafe(r.updated_at),
      deletedAt: r.deleted_at ? toISOStringSafe(r.deleted_at) : null,
    })),
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
  };
}
