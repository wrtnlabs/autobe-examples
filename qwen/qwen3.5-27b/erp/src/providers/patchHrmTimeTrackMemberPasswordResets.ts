import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberPasswordResetAtSummaryTransformer } from "../transformers/HrmTimeTrackMemberPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberPasswordResets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackMemberPasswordReset.IRequest;
}): Promise<IPageIHrmTimeTrackMemberPasswordReset.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_member_password_resetsWhereInput = {
    deleted_at: null,
  };
  if (props.body.member_email !== undefined) {
    whereInput.member = {
      email: props.body.member_email,
    };
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "unused") {
      whereInput.used_at = null;
      whereInput.expired_at = {
        gt: now,
      };
    } else if (props.body.status === "used") {
      whereInput.used_at = {
        not: null,
      };
    } else if (props.body.status === "expired") {
      whereInput.used_at = null;
      whereInput.expired_at = {
        lt: now,
      };
    }
  }
  if (props.body.created_at_gte !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_gte),
    };
  }
  if (props.body.created_at_lte !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_lte),
    };
  }
  if (props.body.expired_at_gte !== undefined) {
    whereInput.expired_at = {
      gte: new Date(props.body.expired_at_gte),
    };
  }
  if (props.body.expired_at_lte !== undefined) {
    whereInput.expired_at = {
      lte: new Date(props.body.expired_at_lte),
    };
  }
  if (props.body.token_pattern !== undefined) {
    whereInput.token = {
      contains: props.body.token_pattern,
    };
  }
  const records =
    await MyGlobal.prisma.hrm_time_track_member_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackMemberPasswordResetAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_track_member_password_resets.count({
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
      HrmTimeTrackMemberPasswordResetAtSummaryTransformer.transform,
    ),
  };
}
