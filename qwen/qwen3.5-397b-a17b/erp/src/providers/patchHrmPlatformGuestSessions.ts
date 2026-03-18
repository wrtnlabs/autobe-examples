import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { HrmPlatformMemberSessionAtSummaryTransformer } from "../transformers/HrmPlatformMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformGuestSessions(props: {
  guest: GuestPayload;
  body: IHrmPlatformMemberSession.IRequest;
}): Promise<IPageIHrmPlatformMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.hrm_platform_member_sessionsWhereInput = {
    member_id: props.guest.id,
    ...(props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: {
          gte: new Date(props.body.created_at_from),
          lte: new Date(props.body.created_at_to),
        },
      }),
    ...(!props.body.created_at_from &&
      props.body.created_at_to && {
        created_at: { lte: new Date(props.body.created_at_to) },
      }),
    ...(props.body.created_at_from &&
      !props.body.created_at_to && {
        created_at: { gte: new Date(props.body.created_at_from) },
      }),
    ...(props.body.expired_at && {
      expired_at: { gt: new Date(props.body.expired_at) },
    }),
  } satisfies Prisma.hrm_platform_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...HrmPlatformMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.hrm_platform_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      HrmPlatformMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
