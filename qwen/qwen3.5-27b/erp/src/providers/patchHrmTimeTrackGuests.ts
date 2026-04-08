import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackGuestAtSummaryTransformer } from "../transformers/HrmTimeTrackGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackGuests(props: {
  body: IHrmTimeTrackGuest.IRequest;
}): Promise<IPageIHrmTimeTrackGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_guestsWhereInput = {
    deleted_at: null,
  };
  if (
    props.body.search !== undefined &&
    props.body.search !== null &&
    props.body.search.length > 0
  ) {
    whereInput.email = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  if (props.body.status !== undefined && props.body.status !== null) {
    whereInput.status = props.body.status;
  }
  if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null &&
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    whereInput.created_at = {
      gt: new Date(props.body.created_after),
      lt: new Date(props.body.created_before),
    };
  } else if (
    props.body.created_after !== undefined &&
    props.body.created_after !== null
  ) {
    whereInput.created_at = {
      gt: new Date(props.body.created_after),
    };
  } else if (
    props.body.created_before !== undefined &&
    props.body.created_before !== null
  ) {
    whereInput.created_at = {
      lt: new Date(props.body.created_before),
    };
  }
  const records = await MyGlobal.prisma.hrm_time_track_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTimeTrackGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_track_guests.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackGuestAtSummaryTransformer.transform,
    ),
  };
}
