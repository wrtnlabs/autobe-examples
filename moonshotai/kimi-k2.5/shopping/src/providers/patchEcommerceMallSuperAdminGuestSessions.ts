import { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuestSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuestSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallGuestSessionAtSummaryTransformer } from "../transformers/EcommerceMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminGuestSessions(props: {
  superAdmin: SuperadminPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.ecommerce_mall_guest_sessionsWhereInput = {
    ...(props.body.ip !== undefined &&
      props.body.ip !== null && {
        ip: { contains: props.body.ip },
      }),
    ...(props.body.referrer !== undefined &&
      props.body.referrer !== null && {
        referrer: { contains: props.body.referrer },
      }),
    ...(props.body.href !== undefined &&
      props.body.href !== null && {
        href: { contains: props.body.href },
      }),
    ...(props.body.guestId !== undefined &&
      props.body.guestId !== null && {
        ecommerce_mall_guest_id: props.body.guestId,
      }),
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtFrom !== null && {
        created_at: {
          ...(props.body.createdAtTo !== undefined &&
          props.body.createdAtTo !== null
            ? { gte: props.body.createdAtFrom, lte: props.body.createdAtTo }
            : { gte: props.body.createdAtFrom }),
        },
      }),
    ...(props.body.createdAtTo !== undefined &&
      props.body.createdAtTo !== null &&
      (props.body.createdAtFrom === undefined ||
        props.body.createdAtFrom === null) && {
        created_at: { lte: props.body.createdAtTo },
      }),
    ...(props.body.expiredAtFrom !== undefined &&
      props.body.expiredAtFrom !== null && {
        expired_at: {
          ...(props.body.expiredAtTo !== undefined &&
          props.body.expiredAtTo !== null
            ? { gte: props.body.expiredAtFrom, lte: props.body.expiredAtTo }
            : { gte: props.body.expiredAtFrom }),
        },
      }),
    ...(props.body.expiredAtTo !== undefined &&
      props.body.expiredAtTo !== null &&
      (props.body.expiredAtFrom === undefined ||
        props.body.expiredAtFrom === null) && {
        expired_at: { lte: props.body.expiredAtTo },
      }),
  };
  const sortColumn =
    props.body.sortBy === "expired_at" ? "expired_at" : "created_at";
  const sortDirection = props.body.sortOrder ?? "desc";
  const data = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
    where,
    skip,
    take: limit,
    orderBy: { [sortColumn]: sortDirection },
    ...EcommerceMallGuestSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
    where,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallGuestSessionAtSummaryTransformer.transform,
  );
  const totalPages = Math.ceil(total / limit);
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
