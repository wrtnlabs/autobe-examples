import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { ErpHrmMemberSessionAtSummaryTransformer } from "../transformers/ErpHrmMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmGuestSessions(props: {
  guest: GuestPayload;
  body: IErpHrmMemberSession.IRequest;
}): Promise<IPageIErpHrmMemberSession.ISummary> {
  // Get the member_id from the guest's session
  const guestSession =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.guest.session_id },
      select: { erp_hrm_member_id: true },
    });
  const memberId = guestSession.erp_hrm_member_id;
  // Build where conditions for the query
  const whereInput: Prisma.erp_hrm_member_sessionsWhereInput = {
    erp_hrm_member_id: memberId,
  };
  // Build date range filter for created_at
  const createdAtFilter: Prisma.DateTimeFilter = {};
  if (props.body.createdAfter !== null) {
    createdAtFilter.gte = new Date(props.body.createdAfter);
  }
  if (props.body.createdBefore !== null) {
    createdAtFilter.lte = new Date(props.body.createdBefore);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter;
  }
  // Apply status filter based on expired_at
  if (props.body.status === "active") {
    whereInput.expired_at = { gt: new Date() };
  } else if (props.body.status === "expired") {
    whereInput.expired_at = { lte: new Date() };
  }
  // Apply IP pattern filter (case-insensitive partial match)
  if (props.body.ipPattern !== null) {
    whereInput.ip = {
      contains: props.body.ipPattern,
      mode: "insensitive",
    };
  }
  // Apply referrer pattern filter (case-insensitive partial match)
  if (props.body.referrerPattern !== null) {
    whereInput.referrer = {
      contains: props.body.referrerPattern,
      mode: "insensitive",
    };
  }
  // Pagination parameters
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const skip = (page - 1) * limit;
  // Query sessions with filters and pagination
  const sessions = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmMemberSessionAtSummaryTransformer.select(),
  });
  // Get total count for pagination
  const total = await MyGlobal.prisma.erp_hrm_member_sessions.count({
    where: whereInput,
  });
  // Transform database records to DTOs
  const data = await ArrayUtil.asyncMap(
    sessions,
    ErpHrmMemberSessionAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
