import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { IHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuestSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmsGuestSessionAtSummaryTransformer } from "../transformers/HrmsGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsGuestGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmsGuestSession.IRequest;
}): Promise<IPageIHrmsGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? props.body.page_size ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause from optional filters
  const whereInput: Prisma.hrms_guest_sessionsWhereInput = {};
  // Date range filters
  if (
    props.body.created_date_range &&
    props.body.created_date_range.length >= 2
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.created_date_range[0]),
      lte: new Date(props.body.created_date_range[1]),
    };
  }
  if (
    props.body.expired_date_range &&
    props.body.expired_date_range.length >= 2
  ) {
    whereInput.expired_at = {
      gte: new Date(props.body.expired_date_range[0]),
      lte: new Date(props.body.expired_date_range[1]),
    };
  }
  // Expiration status filter
  if (props.body.expired_status === "expired") {
    whereInput.expired_at = {
      ...((whereInput.expired_at ??
        {}) as Prisma.hrms_guest_sessionsWhereInput),
      lte: new Date(),
    };
  } else if (props.body.expired_status === "non_expired") {
    whereInput.expired_at = {
      ...((whereInput.expired_at ??
        {}) as Prisma.hrms_guest_sessionsWhereInput),
      gt: new Date(),
    };
  }
  // Guest ID filter
  if (props.body.hrms_guest_id) {
    whereInput.hrms_guest_id = props.body.hrms_guest_id;
  }
  // IP address filter
  if (props.body.ip_address) {
    whereInput.ip = props.body.ip_address;
  }
  // Referrer URL filter
  if (props.body.referrer_url) {
    whereInput.referrer = { contains: props.body.referrer_url };
  }
  // Get data
  const data = await MyGlobal.prisma.hrms_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: {
      [props.body.sort_by ?? "created_at"]: props.body.sort_order ?? "desc",
    } satisfies Prisma.hrms_guest_sessionsOrderByWithRelationInput,
    ...HrmsGuestSessionAtSummaryTransformer.select(),
  });
  // Get total count
  const total = await MyGlobal.prisma.hrms_guest_sessions.count({
    where: whereInput,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    HrmsGuestSessionAtSummaryTransformer.transform,
  );
  // Return paginated response
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
