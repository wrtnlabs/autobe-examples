import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberSession";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsMemberSessionAtSummaryTransformer } from "../transformers/HrmsMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmsMemberSessions(props: {
  member: MemberPayload;
  body: IHrmsMemberSession.IRequest;
}): Promise<IPageIHrmsMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrms_member_sessionsWhereInput = {
    hrms_member_id: props.member.id,
    current_organization_id: props.body.currentOrganizationId,
    created_at: {
      ...(props.body.createdFrom !== undefined
        ? { gte: new Date(props.body.createdFrom) }
        : {}),
      ...(props.body.createdTo !== undefined
        ? { lte: new Date(props.body.createdTo) }
        : {}),
    },
    expired_at: {
      ...(props.body.expiredFrom !== undefined
        ? { gte: new Date(props.body.expiredFrom) }
        : {}),
      ...(props.body.expiredTo !== undefined
        ? { lte: new Date(props.body.expiredTo) }
        : {}),
    },
    ...(props.body.search !== undefined
      ? {
          OR: [
            { ip: { contains: props.body.search } },
            { user_agent: { contains: props.body.search } },
          ],
        }
      : {}),
  } satisfies Prisma.hrms_member_sessionsWhereInput;
  const orderByInput: Prisma.hrms_member_sessionsOrderByWithRelationInput =
    (props.body.sort === "created_at"
      ? { created_at: props.body.order ?? "desc" }
      : undefined) ??
      (props.body.sort === "expired_at"
        ? { expired_at: props.body.order ?? "desc" }
        : undefined) ??
      (props.body.sort === "ip"
        ? { ip: props.body.order ?? "asc" }
        : undefined) ??
      (props.body.sort === "user_agent"
        ? { user_agent: props.body.order ?? "asc" }
        : undefined) ?? { created_at: "desc" };
  const data = await MyGlobal.prisma.hrms_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...HrmsMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrms_member_sessions.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      HrmsMemberSessionAtSummaryTransformer.transform,
    ),
  };
}
