import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleAtSummaryTransformer } from "../transformers/HrmTimeTrackRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberRoles(props: {
  member: MemberPayload;
  body: IHrmTimeTrackRole.IRequest;
}): Promise<IPageIHrmTimeTrackRole.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get organization context from member session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  // Build WHERE clause
  const whereInput: Prisma.hrm_time_track_rolesWhereInput = {
    hrm_time_track_organization_id: session.hrm_time_track_organization_id,
    deleted_at: null,
    ...(props.body.name !== undefined &&
      props.body.name !== "" && {
        name: {
          contains: props.body.name,
          mode: "insensitive",
        },
      }),
    ...(props.body.is_builtin !== undefined && {
      is_builtin: props.body.is_builtin,
    }),
    ...(props.body.has_description !== undefined && {
      description: props.body.has_description
        ? { not: null }
        : { equals: null },
    }),
  };
  // Build ORDER BY clause with proper type handling
  const orderByInput: Prisma.hrm_time_track_rolesOrderByWithRelationInput =
    props.body.sort !== undefined && props.body.sort !== ""
      ? { [props.body.sort]: props.body.order ?? "desc" }
      : { created_at: "desc" };
  // Fetch records
  const records = await MyGlobal.prisma.hrm_time_track_roles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmTimeTrackRoleAtSummaryTransformer.select(),
  });
  // Count total
  const total = await MyGlobal.prisma.hrm_time_track_roles.count({
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
      HrmTimeTrackRoleAtSummaryTransformer.transform,
    ),
  };
}
