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

export async function patchHrmTimeTrackMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmTimeTrackOrganization.IRequest;
}): Promise<IPageIHrmTimeTrackOrganization.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    employees: {
      some: {
        hrm_time_track_member_id: props.member.id,
      },
    },
    ...(props.body.search && {
      OR: [
        { name: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
  } satisfies Prisma.hrm_time_track_organizationsWhereInput;
  const [records, total] = await Promise.all([
    MyGlobal.prisma.hrm_time_track_organizations.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackOrganizationAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.hrm_time_track_organizations.count({
      where: whereInput,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      HrmTimeTrackOrganizationAtSummaryTransformer.transform,
    ),
  };
}
