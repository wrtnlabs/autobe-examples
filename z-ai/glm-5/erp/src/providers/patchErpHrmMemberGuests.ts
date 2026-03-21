import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmGuestAtSummaryTransformer } from "../transformers/ErpHrmGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberGuests(props: {
  member: MemberPayload;
  body: IErpHrmGuest.IRequest;
}): Promise<IPageIErpHrmGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.fingerprint && {
      fingerprint: {
        contains: props.body.fingerprint,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_at_from || props.body.created_at_to
      ? {
          created_at: {
            ...(props.body.created_at_from && {
              gte: new Date(props.body.created_at_from),
            }),
            ...(props.body.created_at_to && {
              lte: new Date(props.body.created_at_to),
            }),
          },
        }
      : {}),
    ...((props.body.deleted ?? false) === false && {
      deleted_at: null,
    }),
  } satisfies Prisma.erp_hrm_guestsWhereInput;
  const data = await MyGlobal.prisma.erp_hrm_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...ErpHrmGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_guests.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      ErpHrmGuestAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
