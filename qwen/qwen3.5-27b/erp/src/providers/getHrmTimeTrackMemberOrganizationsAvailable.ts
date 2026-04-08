import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "../transformers/HrmTimeTrackOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackMemberOrganizationsAvailable(props: {
  member: MemberPayload;
}): Promise<IPageIHrmTimeTrackOrganization.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const employees = await MyGlobal.prisma.hrm_time_track_employees.findMany({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
      status: "active",
      organization: {
        deleted_at: null,
      },
    },
    skip,
    take: limit,
    orderBy: {
      organization: {
        name: "asc",
      },
    },
    select: {
      organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.hrm_time_track_employees.count({
    where: {
      hrm_time_track_member_id: props.member.id,
      deleted_at: null,
      status: "active",
      organization: {
        deleted_at: null,
      },
    },
  });
  const organizations = employees.map((e) => e.organization);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      organizations,
      HrmTimeTrackOrganizationAtSummaryTransformer.transform,
    ),
  };
}
