import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallGuestAtSummaryTransformer } from "../transformers/EcommerceMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminGuests(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallGuest.IRequest;
}): Promise<IPageIEcommerceMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause for guest sessions filter
  const sessionWhere: Prisma.ecommerce_mall_guest_sessionsWhereInput = {
    ...(props.body.lastActivityAtStart !== undefined &&
      props.body.lastActivityAtStart !== null && {
        last_activity_at: { gte: new Date(props.body.lastActivityAtStart) },
      }),
    ...(props.body.lastActivityAtEnd !== undefined &&
      props.body.lastActivityAtEnd !== null && {
        last_activity_at: { lte: new Date(props.body.lastActivityAtEnd) },
      }),
    ...(props.body.ipPattern !== undefined &&
      props.body.ipPattern !== null && {
        ip: { contains: props.body.ipPattern },
      }),
    ...(props.body.userAgentPattern !== undefined &&
      props.body.userAgentPattern !== null && {
        user_agent: { contains: props.body.userAgentPattern },
      }),
  };
  // Build where clause for guests with optional session filter
  const hasSessionFilters =
    Object.keys(sessionWhere).length > 0 ||
    props.body.lastActivityAtStart !== undefined ||
    props.body.lastActivityAtEnd !== undefined ||
    props.body.ipPattern !== undefined ||
    props.body.userAgentPattern !== undefined;
  const where: Prisma.ecommerce_mall_guestsWhereInput = {
    deleted_at: null,
    ...(props.body.createdAtStart !== undefined &&
      props.body.createdAtStart !== null && {
        created_at: { gte: new Date(props.body.createdAtStart) },
      }),
    ...(props.body.createdAtEnd !== undefined &&
      props.body.createdAtEnd !== null && {
        created_at: { lte: new Date(props.body.createdAtEnd) },
      }),
    ...(hasSessionFilters && {
      sessions: { some: sessionWhere },
    }),
  };
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_guests.count({ where });
  // Get paginated data with transformer selection
  const guests = await MyGlobal.prisma.ecommerce_mall_guests.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceMallGuestAtSummaryTransformer.select(),
  });
  // Transform data
  const data = await ArrayUtil.asyncMap(
    guests,
    EcommerceMallGuestAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
