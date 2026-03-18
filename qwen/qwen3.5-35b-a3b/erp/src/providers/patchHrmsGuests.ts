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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsGuests(props: {
  body: IHrmsGuest.IRequest;
}): Promise<IPageIHrmsGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const whereInput: Prisma.hrms_guestsWhereInput = {
    deleted_at: props.body.activeOnly === false ? undefined : null,
    ...(props.body.createdAfter && {
      created_at: {
        gt: props.body.createdAfter,
      },
    }),
    ...(props.body.createdBefore && {
      created_at: {
        lt: props.body.createdBefore,
      },
    }),
    ...(props.body.updatedAfter && {
      updated_at: {
        gt: props.body.updatedAfter,
      },
    }),
    ...(props.body.updatedBefore && {
      updated_at: {
        lt: props.body.updatedBefore,
      },
    }),
    ...(props.body.deviceFingerprint && {
      device_fingerprint: {
        contains: props.body.deviceFingerprint,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.hrms_guestsWhereInput;
  const orderByInput = {
    created_at: order as "asc" | "desc",
  } satisfies Prisma.hrms_guestsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.hrms_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      device_fingerprint: true,
      ip_address: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.hrms_guests.count({
    where: whereInput,
  });
  return {
    data: data.map((guest) => ({
      id: guest.id as string & tags.Format<"uuid">,
      device_fingerprint: guest.device_fingerprint,
      ip_address: guest.ip_address,
      created_at: guest.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
