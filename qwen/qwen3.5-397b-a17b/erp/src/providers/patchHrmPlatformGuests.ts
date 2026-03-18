import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuests(props: {
  body: IHrmPlatformGuest.IRequest;
}): Promise<IPageIHrmPlatformGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_guestsWhereInput = {
    deleted_at: null,
    ...(props.body.search !== undefined && {
      device_fingerprint: { contains: props.body.search },
    }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to !== undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(props.body.created_at_from !== undefined &&
      props.body.created_at_to === undefined && {
        created_at: {
          gte: new Date(props.body.created_at_from),
        },
      }),
    ...(props.body.created_at_from === undefined &&
      props.body.created_at_to !== undefined && {
        created_at: {
          lte: new Date(props.body.created_at_to),
        },
      }),
  } satisfies Prisma.hrm_platform_guestsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrm_platform_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map((guest) => ({
      id: guest.id,
      device_fingerprint: guest.device_fingerprint,
      created_at: toISOStringSafe(guest.created_at),
    })),
  };
}
