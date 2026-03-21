import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMemberSession";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmMemberAtSummaryTransformer } from "../transformers/ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "../transformers/ErpHrmOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberSessions(props: {
  member: MemberPayload;
  body: IErpHrmMemberSession.IRequest;
}): Promise<IPageIErpHrmMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const now = new Date();
  // Build created_at filter properly handling both from and to
  const createdAtFilter: Prisma.DateTimeFilter | undefined =
    props.body.created_from !== undefined || props.body.created_to !== undefined
      ? {
          ...(props.body.created_from !== undefined && {
            gte: new Date(props.body.created_from),
          }),
          ...(props.body.created_to !== undefined && {
            lte: new Date(props.body.created_to),
          }),
        }
      : undefined;
  const whereInput = {
    ...(props.body.erp_hrm_member_id !== undefined && {
      erp_hrm_member_id: props.body.erp_hrm_member_id,
    }),
    ...(props.body.erp_hrm_organization_id !== undefined && {
      erp_hrm_organization_id: props.body.erp_hrm_organization_id,
    }),
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.expired !== undefined && {
      expired_at: props.body.expired ? { lt: now } : { gte: now },
    }),
    ...(createdAtFilter !== undefined && { created_at: createdAtFilter }),
  } satisfies Prisma.erp_hrm_member_sessionsWhereInput;
  const sessions = await MyGlobal.prisma.erp_hrm_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      updated_at: true,
      expired_at: true,
      member: ErpHrmMemberAtSummaryTransformer.select(),
      organization: ErpHrmOrganizationAtSummaryTransformer.select(),
    },
  });
  const total = await MyGlobal.prisma.erp_hrm_member_sessions.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(sessions, async (session) => ({
    id: session.id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    member: await ErpHrmMemberAtSummaryTransformer.transform(session.member),
    organization: session.organization
      ? await ErpHrmOrganizationAtSummaryTransformer.transform(
          session.organization,
        )
      : null,
    created_at: session.created_at.toISOString(),
    updated_at: session.updated_at.toISOString(),
    expired_at: session.expired_at.toISOString(),
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
