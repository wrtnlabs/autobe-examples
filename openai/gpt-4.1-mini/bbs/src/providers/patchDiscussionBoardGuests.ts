import { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardGuests(props: {
  body: IDiscussionBoardGuest.IRequest;
}): Promise<IPageIDiscussionBoardGuest.ISummary> {
  // Build filters with only defined, no type predicate
  const filters = [] as Prisma.discussion_board_guestsWhereInput[];
  if (
    props.body.deviceFingerprint !== undefined &&
    props.body.deviceFingerprint !== null
  ) {
    filters.push({
      device_fingerprint: { contains: props.body.deviceFingerprint },
    });
  }
  if (props.body.userAgent !== undefined && props.body.userAgent !== null) {
    filters.push({ user_agent: { contains: props.body.userAgent } });
  }
  if (props.body.ipAddress !== undefined && props.body.ipAddress !== null) {
    filters.push({ ip_address: { contains: props.body.ipAddress } });
  }
  if (props.body.anonymousId !== undefined && props.body.anonymousId !== null) {
    filters.push({ anonymous_id: { contains: props.body.anonymousId } });
  }
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    filters.push({ created_at: { gte: new Date(props.body.createdAtFrom) } });
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    filters.push({ created_at: { lte: new Date(props.body.createdAtTo) } });
  }
  if (
    props.body.updatedAtFrom !== undefined &&
    props.body.updatedAtFrom !== null
  ) {
    filters.push({ updated_at: { gte: new Date(props.body.updatedAtFrom) } });
  }
  if (props.body.updatedAtTo !== undefined && props.body.updatedAtTo !== null) {
    filters.push({ updated_at: { lte: new Date(props.body.updatedAtTo) } });
  }
  const where: Prisma.discussion_board_guestsWhereInput =
    filters.length > 0 ? { AND: filters } : {};
  const page =
    props.body.page !== undefined && props.body.page > 0 ? props.body.page : 1;
  const limit =
    props.body.limit !== undefined &&
    props.body.limit > 0 &&
    props.body.limit <= 100
      ? props.body.limit
      : 50;
  const skip = (page - 1) * limit;
  const sortByField =
    props.body.sortBy === "updatedAt" ? "updated_at" : "created_at";
  const sortOrder = props.body.sortOrder === "asc" ? "asc" : "desc";
  const data = await MyGlobal.prisma.discussion_board_guests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortByField]: sortOrder },
  });
  const total = await MyGlobal.prisma.discussion_board_guests.count({ where });
  // Safe conversion from Date|null|undefined to string|null
  function toDateTimeString(dt: Date | null | undefined): string | null {
    if (dt === null || dt === undefined) return null;
    return toISOStringSafe(dt);
  }
  const summaries: IDiscussionBoardGuest.ISummary[] = data.map((item) => ({
    id: item.id,
    deviceFingerprint: item.device_fingerprint,
    userAgent: item.user_agent,
    ipAddress: item.ip_address,
    anonymousId: item.anonymous_id,
    createdAt: toISOStringSafe(item.created_at) as string &
      tags.Format<"date-time">,
    updatedAt: toISOStringSafe(item.updated_at) as string &
      tags.Format<"date-time">,
    deletedAt: toDateTimeString(item.deleted_at) as
      | (string & tags.Format<"date-time">)
      | null,
  }));
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: summaries,
  };
}
