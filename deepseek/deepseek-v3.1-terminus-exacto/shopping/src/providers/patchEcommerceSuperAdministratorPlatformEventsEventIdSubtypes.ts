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

export async function patchEcommerceSuperAdministratorPlatformEventsEventIdSubtypes(props: {
  superAdministrator: SuperadministratorPayload;
  eventId: string & tags.Format<"uuid">;
  body: IEcommercePlatformEvent.IRequest;
}): Promise<IPageIEcommercePlatformEvent.ISummary> {
  // Verify parent event exists
  await MyGlobal.prisma.ecommerce_platform_events.findUniqueOrThrow({
    where: { id: props.eventId },
  });
  // Prepare pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where conditions
  const whereConditions: Prisma.ecommerce_platform_eventsWhereInput[] = [
    { id: { not: props.eventId } },
  ];
  // Polymorphic relation filter - find events that have any association with the parent event
  whereConditions.push({
    OR: [
      {
        customerInitiators: { some: { platformEvent: { id: props.eventId } } },
      },
      { sellerInitiators: { some: { platformEvent: { id: props.eventId } } } },
      { administratorEvent: { platformEvent: { id: props.eventId } } },
      {
        superAdministratorInitiators: {
          some: { platformEvent: { id: props.eventId } },
        },
      },
    ],
  });
  // Apply filters from request body
  if (props.body.event_type) {
    whereConditions.push({ event_type: props.body.event_type });
  }
  if (props.body.event_severity) {
    whereConditions.push({ event_severity: props.body.event_severity });
  }
  if (props.body.event_source) {
    whereConditions.push({ event_source: props.body.event_source });
  }
  if (props.body.date_from) {
    whereConditions.push({
      created_at: { gte: new Date(props.body.date_from) },
    });
  }
  if (props.body.date_to) {
    whereConditions.push({ created_at: { lte: new Date(props.body.date_to) } });
  }
  if (props.body.search) {
    whereConditions.push({
      OR: [
        {
          event_type: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          event_source: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
        {
          event_payload: {
            contains: props.body.search,
            mode: "insensitive" as const,
          },
        },
      ],
    });
  }
  const whereInput: Prisma.ecommerce_platform_eventsWhereInput = {
    AND: whereConditions,
  };
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_platform_events.findMany({
      where: whereInput,
      ...EcommercePlatformEventAtSummaryTransformer.select(),
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
    }),
    MyGlobal.prisma.ecommerce_platform_events.count({ where: whereInput }),
  ]);
  // Transform data
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommercePlatformEventAtSummaryTransformer.transform,
  );
  // Return paginated result
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
