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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallGuestSessionAtSummaryTransformer } from "../transformers/EcommerceMallGuestSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminGuestSessions(props: {
  admin: AdminPayload;
  body: IEcommerceMallGuestSession.IRequest;
}): Promise<IPageIEcommerceMallGuestSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_guest_sessionsWhereInput = {};
  if (props.body.ip) {
    whereInput.ip = { contains: props.body.ip };
  }
  if (props.body.referrer) {
    whereInput.referrer = { contains: props.body.referrer };
  }
  if (props.body.href) {
    whereInput.href = { contains: props.body.href };
  }
  if (props.body.guestId) {
    whereInput.ecommerce_mall_guest_id = props.body.guestId;
  }
  if (props.body.createdAtFrom || props.body.createdAtTo) {
    whereInput.created_at = {
      ...(props.body.createdAtFrom && {
        gte: new Date(props.body.createdAtFrom),
      }),
      ...(props.body.createdAtTo && { lte: new Date(props.body.createdAtTo) }),
    };
  }
  if (props.body.expiredAtFrom || props.body.expiredAtTo) {
    whereInput.expired_at = {
      ...(props.body.expiredAtFrom && {
        gte: new Date(props.body.expiredAtFrom),
      }),
      ...(props.body.expiredAtTo && { lte: new Date(props.body.expiredAtTo) }),
    };
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy: Prisma.ecommerce_mall_guest_sessionsOrderByWithRelationInput =
    sortBy === "expired_at"
      ? { expired_at: sortOrder }
      : { created_at: sortOrder };
  const transformerSelect =
    EcommerceMallGuestSessionAtSummaryTransformer.select();
  const data = await MyGlobal.prisma.ecommerce_mall_guest_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy,
    select: transformerSelect.select,
  });
  const total = await MyGlobal.prisma.ecommerce_mall_guest_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallGuestSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
