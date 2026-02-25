import { IEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEvent";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEvent";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommercePlatformEventAtSummaryTransformer } from "../transformers/EcommercePlatformEventAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorPlatformEventsEventIdSubtypes(props: {
  administrator: AdministratorPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEcommercePlatformEvent.IRequest;
}): Promise<IPageIEcommercePlatformEvent.ISummary> {
  // Verify parent event exists and admin has access
  await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
    where: { id: props.eventId },
  });
  // Build pagination with bounds checking
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  // Build comprehensive WHERE conditions
  const whereConditions: Prisma.ecommerce_platform_eventsWhereInput = {};
  // Text filters
  if (props.body.event_type !== undefined && props.body.event_type !== null) {
    whereConditions.event_type = { equals: props.body.event_type };
  }
  if (
    props.body.event_severity !== undefined &&
    props.body.event_severity !== null
  ) {
    whereConditions.event_severity = { equals: props.body.event_severity };
  }
  if (
    props.body.event_source !== undefined &&
    props.body.event_source !== null
  ) {
    whereConditions.event_source = { equals: props.body.event_source };
  }
  // Date range filters using ISO strings directly
  if (props.body.date_from !== undefined && props.body.date_from !== null) {
    whereConditions.created_at = { gte: props.body.date_from };
  }
  if (props.body.date_to !== undefined && props.body.date_to !== null) {
    whereConditions.created_at = {
      ...(whereConditions.created_at as object),
      lte: props.body.date_to,
    };
  }
  // Search text filter across relevant fields
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    const searchTerm = `%${props.body.search}%`;
    whereConditions.OR = [
      { event_type: { contains: props.body.search, mode: "insensitive" } },
      { event_severity: { contains: props.body.search, mode: "insensitive" } },
      { event_source: { contains: props.body.search, mode: "insensitive" } },
      { correlation_id: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_events.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformEventAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_events.count({ where: whereConditions }),
  ]);
  // Transform results using the Summary transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformEventAtSummaryTransformer.transform,
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
