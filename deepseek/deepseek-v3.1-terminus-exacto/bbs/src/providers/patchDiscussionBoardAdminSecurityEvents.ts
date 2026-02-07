import { IDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSecurityEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSecurityEvent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSecurityEventAtSummaryTransformer } from "../transformers/DiscussionBoardSecurityEventAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSecurityEvents(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSecurityEvent.IRequest;
}): Promise<IPageIDiscussionBoardSecurityEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause for filtering
  const whereInput: Prisma.discussion_board_security_eventsWhereInput = {
    ...(props.body.event_type !== undefined &&
      props.body.event_type !== null && { event_type: props.body.event_type }),
    ...(props.body.severity !== undefined &&
      props.body.severity !== null && { severity: props.body.severity }),
    ...(props.body.user_id !== undefined &&
      props.body.user_id !== null && { user_id: props.body.user_id }),
    ...(props.body.admin_id !== undefined &&
      props.body.admin_id !== null && { admin_id: props.body.admin_id }),
    ...(props.body.super_admin_id !== undefined &&
      props.body.super_admin_id !== null && {
        super_admin_id: props.body.super_admin_id,
      }),
    ...(props.body.resolved !== undefined &&
      props.body.resolved !== null && { resolved: props.body.resolved }),
  };
  // Handle date range filters
  if (
    props.body.created_at_start !== undefined &&
    props.body.created_at_start !== null
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_start),
    };
  }
  if (
    props.body.created_at_end !== undefined &&
    props.body.created_at_end !== null
  ) {
    // Fix: Properly handle the type of whereInput.created_at
    if (
      whereInput.created_at &&
      typeof whereInput.created_at === "object" &&
      "gte" in whereInput.created_at
    ) {
      // It's already a DateTimeFilter object
      whereInput.created_at.lte = new Date(props.body.created_at_end);
    } else {
      // It's not a DateTimeFilter object, create new one
      whereInput.created_at = {
        lte: new Date(props.body.created_at_end),
      };
    }
  }
  // Handle search with trigram indexing
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereInput.description = {
      contains: props.body.search,
    };
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_security_events.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardSecurityEventAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_security_events.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardSecurityEventAtSummaryTransformer.transform,
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
