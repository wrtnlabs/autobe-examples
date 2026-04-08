import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberEmailVerificationAtSummaryTransformer } from "../transformers/HrmTimeTrackMemberEmailVerificationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberEmailVerifications(props: {
  member: MemberPayload;
  body: IHrmTimeTrackMemberEmailVerification.IRequest;
}): Promise<IPageIHrmTimeTrackMemberEmailVerification.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_member_email_verificationsWhereInput =
    {
      deleted_at: null,
    };
  if (props.body.search !== undefined && props.body.search !== "") {
    whereInput.OR = [
      {
        email: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        token: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }
  if (props.body.member_id !== undefined) {
    whereInput.hrm_time_track_member_id = props.body.member_id;
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
        lte: now,
      };
    }
  }
  const records =
    await MyGlobal.prisma.hrm_time_track_member_email_verifications.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      ...HrmTimeTrackMemberEmailVerificationAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_track_member_email_verifications.count({
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
      HrmTimeTrackMemberEmailVerificationAtSummaryTransformer.transform,
    ),
  };
}
