import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberSession";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmTimeTrackMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackMemberSessionAtSummaryTransformer } from "../transformers/HrmTimeTrackMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberSessions(props: {
  member: MemberPayload;
  body: IHrmTimeTrackMemberSession.IRequest;
}): Promise<IPageIHrmTimeTrackMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_time_track_member_sessionsWhereInput = {};
  if (props.body.member_id !== undefined) {
    whereInput.hrm_time_track_member_id = props.body.member_id;
  }
  if (props.body.organization_id !== undefined) {
    whereInput.hrm_time_track_organization_id = props.body.organization_id;
  }
  if (props.body.created_after !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before !== undefined) {
    whereInput.created_at = whereInput.created_at ?? {};
    (whereInput.created_at as any).lte = new Date(props.body.created_before);
  }
  if (props.body.expired_after !== undefined) {
    whereInput.expired_at = {
      gte: new Date(props.body.expired_after),
    };
  }
  if (props.body.expired_before !== undefined) {
    whereInput.expired_at = whereInput.expired_at ?? {};
    (whereInput.expired_at as any).lte = new Date(props.body.expired_before);
  }
  if (props.body.expired !== undefined) {
    const now = new Date();
    if (props.body.expired === true) {
      whereInput.expired_at = whereInput.expired_at ?? {};
      (whereInput.expired_at as any).lt = now;
    } else {
      whereInput.expired_at = whereInput.expired_at ?? {};
      (whereInput.expired_at as any).gte = now;
    }
  }
  if (props.body.ip !== undefined) {
    whereInput.ip = props.body.ip;
  }
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereInput.OR = [
      { href: { contains: props.body.search } },
      { referrer: { contains: props.body.search } },
    ];
  }
  const records = await MyGlobal.prisma.hrm_time_track_member_sessions.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...HrmTimeTrackMemberSessionAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.hrm_time_track_member_sessions.count({
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
      HrmTimeTrackMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
