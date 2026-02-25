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

export async function patchEcommerceAdministratorPlatformEvents(props: {
  administrator: AdministratorPayload;
  body: IEcommercePlatformEvent.IRequest;
}): Promise<IPageIEcommercePlatformEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause incrementally to avoid circular dependency
  const whereInput: Prisma.ecommerce_platform_eventsWhereInput = {};
  // Add filter conditions one by one
  if (props.body.event_type !== undefined && props.body.event_type !== null) {
    whereInput.event_type = props.body.event_type;
  }
  if (
    props.body.event_severity !== undefined &&
    props.body.event_severity !== null
  ) {
    whereInput.event_severity = props.body.event_severity;
  }
  if (
    props.body.event_source !== undefined &&
    props.body.event_source !== null
  ) {
    whereInput.event_source = props.body.event_source;
  }
  // Handle date filters separately without spread on potentially undefined values
  if (
    (props.body.date_from !== undefined && props.body.date_from !== null) ||
    (props.body.date_to !== undefined && props.body.date_to !== null)
  ) {
    whereInput.created_at = {};
    if (props.body.date_from !== undefined && props.body.date_from !== null) {
      whereInput.created_at.gte = new Date(props.body.date_from);
    }
    if (props.body.date_to !== undefined && props.body.date_to !== null) {
      whereInput.created_at.lte = new Date(props.body.date_to);
    }
  }
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.trim() !== ""
  ) {
    whereInput.event_payload = {
      contains: props.body.search,
      mode: "insensitive" as const,
    };
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_events.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommercePlatformEventAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_events.count({
      where: whereInput,
    }),
  ]);
  // Transform data
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
