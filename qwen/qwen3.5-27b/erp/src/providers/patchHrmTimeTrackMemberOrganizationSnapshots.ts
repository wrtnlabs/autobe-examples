import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganizationSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackOrganizationSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackOrganizationSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackOrganizationSnapshotAtSummaryTransformer } from "../transformers/HrmTimeTrackOrganizationSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberOrganizationSnapshots(props: {
  member: MemberPayload;
  body: IHrmTimeTrackOrganizationSnapshot.IRequest;
}): Promise<IPageIHrmTimeTrackOrganizationSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_organization_snapshotsWhereInput = {};
  if (props.body.created_at_start !== undefined) {
    whereInput.created_at = {
      gte: props.body.created_at_start,
    };
  }
  if (props.body.created_at_end !== undefined) {
    if (whereInput.created_at === undefined) {
      whereInput.created_at = {};
    }
    (
      whereInput.created_at as Prisma.DateTimeFilter<"hrm_time_track_organization_snapshots">
    ).lte = props.body.created_at_end;
  }
  if (props.body.search !== undefined) {
    whereInput.OR = [
      { name: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.currency !== undefined) {
    whereInput.currency = props.body.currency;
  }
  const records =
    await MyGlobal.prisma.hrm_time_track_organization_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackOrganizationSnapshotAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.hrm_time_track_organization_snapshots.count({
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
      HrmTimeTrackOrganizationSnapshotAtSummaryTransformer.transform,
    ),
  };
}
