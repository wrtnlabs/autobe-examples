import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIPrivateTodoAppMemberSession";
import { IPrivateTodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMember";
import { IPrivateTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PrivateTodoAppMemberSessionAtSummaryTransformer } from "../transformers/PrivateTodoAppMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchPrivateTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: IPrivateTodoAppMemberSession.IRequest;
}): Promise<IPageIPrivateTodoAppMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    member_id: props.member.id,
    ...(props.body.ip !== undefined && {
      ip: { contains: props.body.ip },
    }),
    ...(props.body.created_from !== undefined ||
    props.body.created_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_from !== undefined && {
              gte: new Date(props.body.created_from),
            }),
            ...(props.body.created_to !== undefined && {
              lte: new Date(props.body.created_to),
            }),
          },
        }
      : {}),
    ...(props.body.expired_from !== undefined ||
    props.body.expired_to !== undefined
      ? {
          expired_at: {
            ...(props.body.expired_from !== undefined && {
              gte: new Date(props.body.expired_from),
            }),
            ...(props.body.expired_to !== undefined && {
              lte: new Date(props.body.expired_to),
            }),
          },
        }
      : {}),
    ...(props.body.is_active !== undefined && {
      expired_at: props.body.is_active
        ? { gt: new Date() }
        : { lte: new Date() },
    }),
  } satisfies Prisma.private_todo_app_member_sessionsWhereInput;
  const data = await MyGlobal.prisma.private_todo_app_member_sessions.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...PrivateTodoAppMemberSessionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.private_todo_app_member_sessions.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      PrivateTodoAppMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
