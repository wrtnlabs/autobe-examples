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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommercePlatformEventAtSummaryTransformer } from "../transformers/EcommercePlatformEventAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSuperAdministratorPlatformEvents(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommercePlatformEvent.IRequest;
}): Promise<IPageIEcommercePlatformEvent.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build WHERE clause with all filter conditions
  const whereInput = {
    ...(props.body.event_type !== undefined &&
      props.body.event_type !== null && { event_type: props.body.event_type }),
    ...(props.body.event_severity !== undefined &&
      props.body.event_severity !== null && {
        event_severity: props.body.event_severity,
      }),
    ...(props.body.event_source !== undefined &&
      props.body.event_source !== null && {
        event_source: props.body.event_source,
      }),
    ...(props.body.date_from !== undefined &&
      props.body.date_from !== null && {
        created_at: {
          gte: new Date(props.body.date_from),
        },
      }),
    ...(props.body.date_to !== undefined &&
      props.body.date_to !== null && {
        created_at: {
          lte: new Date(props.body.date_to),
        },
      }),
    ...(props.body.search !== undefined &&
      props.body.search !== null && {
        event_payload: {
          contains: props.body.search,
        },
      }),
  } satisfies Prisma.ecommerce_platform_eventsWhereInput;
  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_events.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommercePlatformEventAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_platform_events.count({
      where: whereInput,
    }),
  ]);
  // Transform data using transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformEventAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
