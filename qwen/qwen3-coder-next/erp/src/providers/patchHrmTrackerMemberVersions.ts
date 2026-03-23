import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemVersion";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTrackerSystemVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerSystemVersion";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTrackerMemberVersions(props: {
  member: MemberPayload;
  body: IHrmTrackerSystemVersion.IRequest;
}): Promise<IPageIHrmTrackerSystemVersion.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const cursor = props.body.cursor;
  const pageSize = props.body.page_size ?? 20;
  const where: Prisma.hrm_tracker_system_versionsWhereInput = {};
  if (props.body.search) {
    where.version = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  if (props.body.applied_at_from || props.body.applied_at_to) {
    const dateRange: Prisma.DateTimeFilter | undefined = {};
    if (props.body.applied_at_from) {
      dateRange.gte = props.body.applied_at_from;
    }
    if (props.body.applied_at_to) {
      dateRange.lte = props.body.applied_at_to;
    }
    if (Object.keys(dateRange).length > 0) {
      where.applied_at = dateRange;
    }
  }
  if (props.body.has_rollback !== undefined) {
    where.rollback_version = props.body.has_rollback
      ? { not: null as any }
      : { not: null as any };
  }
  const orderBy: Prisma.hrm_tracker_system_versionsOrderByWithRelationInput = {
    applied_at: "desc",
  };
  let data: Awaited<
    ReturnType<typeof MyGlobal.prisma.hrm_tracker_system_versions.findMany>
  >;
  let nextCursor: string | null = null;
  if (cursor) {
    const decodedCursor = Buffer.from(cursor, "base64").toString("utf8");
    const cursorObj = JSON.parse(decodedCursor);
    const cursorAppliedAt = cursorObj.applied_at as string &
      tags.Format<"date-time">;
    const cursorId = cursorObj.id as string & tags.Format<"uuid">;
    const records = await MyGlobal.prisma.hrm_tracker_system_versions.findMany({
      where: {
        ...where,
        applied_at: { lte: cursorAppliedAt },
        id: { lt: cursorId },
      },
      orderBy: [{ applied_at: "desc" }, { id: "desc" }],
      take: -pageSize,
    });
    if (records.length > 0) {
      const lastRecord = records[records.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({
          applied_at: toISOStringSafe(lastRecord.applied_at),
          id: lastRecord.id,
        }),
      ).toString("base64");
    }
    data = records.reverse();
  } else {
    const skip = (page - 1) * limit;
    data = await MyGlobal.prisma.hrm_tracker_system_versions.findMany({
      where,
      skip,
      take: limit + 1,
      orderBy,
    });
    const hasMore = data.length > limit;
    if (hasMore) {
      const lastRecord = data.pop()!;
      nextCursor = Buffer.from(
        JSON.stringify({
          applied_at: toISOStringSafe(lastRecord.applied_at),
          id: lastRecord.id,
        }),
      ).toString("base64");
    }
  }
  const total = await MyGlobal.prisma.hrm_tracker_system_versions.count({
    where,
  });
  const transformed = await ArrayUtil.asyncMap(data, async (record) => {
    return {
      id: record.id as string & tags.Format<"uuid">,
      version: record.version,
      applied_at: toISOStringSafe(record.applied_at) as string &
        tags.Format<"date-time">,
    } satisfies IHrmTrackerSystemVersion.ISummary;
  });
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: transformed,
  } satisfies IPageIHrmTrackerSystemVersion.ISummary;
}
