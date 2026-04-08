import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackMemberAtSummaryTransformer } from "../transformers/HrmTimeTrackMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMembers(props: {
  body: IHrmTimeTrackMember.IRequest;
}): Promise<IPageIHrmTimeTrackMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_membersWhereInput = {};
  if (props.body.email !== undefined && props.body.email !== "") {
    whereInput.email = {
      contains: props.body.email,
      mode: "insensitive",
    };
  }
  if (props.body.status !== undefined) {
    if (props.body.status === "active") {
      whereInput.deleted_at = null;
    } else if (props.body.status === "deleted") {
      whereInput.deleted_at = {
        not: null,
      };
    }
  }
  if (props.body.created_at_gte !== undefined) {
    whereInput.created_at = {
      gte: props.body.created_at_gte,
    };
  }
  if (props.body.created_at_lte !== undefined) {
    whereInput.created_at = {
      lte: props.body.created_at_lte,
    };
  }
  const records = await MyGlobal.prisma.hrm_time_track_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmTimeTrackMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_time_track_members.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackMemberAtSummaryTransformer.transform,
    ),
  };
}
