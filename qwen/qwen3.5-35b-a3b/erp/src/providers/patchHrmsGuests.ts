import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmsGuestAtSummaryTransformer } from "../transformers/HrmsGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsGuests(props: {
  body: IHrmsGuest.IRequest;
}): Promise<IPageIHrmsGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const order = props.body.order ?? "desc";
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrms_guestsWhereInput = {
    deleted_at: props.body.activeOnly === true ? null : undefined,
    ...(props.body.createdAfter && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
    ...(props.body.updatedAfter && {
      updated_at: { gt: new Date(props.body.updatedAfter) },
    }),
    ...(props.body.updatedBefore && {
      updated_at: { lt: new Date(props.body.updatedBefore) },
    }),
    ...(props.body.deviceFingerprint && {
      device_fingerprint: { contains: props.body.deviceFingerprint },
    }),
  };
  const orderByInput = (
    order === "asc"
      ? { created_at: "asc" as const }
      : { created_at: "desc" as const }
  ) satisfies Prisma.hrms_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrms_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmsGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsGuestAtSummaryTransformer.transform,
    ),
  } satisfies IPageIHrmsGuest.ISummary;
}
