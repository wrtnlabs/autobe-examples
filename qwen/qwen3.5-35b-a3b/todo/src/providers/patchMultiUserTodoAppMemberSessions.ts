import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoAppMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoAppMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoAppMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoAppMemberSessionTransformer } from "../transformers/MultiUserTodoAppMemberSessionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoAppMemberSessions(props: {
  member: MemberPayload;
  body: IMultiUserTodoAppMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoAppMemberSession> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 10, 100);
  const skip = (page - 1) * limit;
  const whereMember: Prisma.multi_user_todo_app_member_sessionsWhereInput = {
    multi_user_todo_app_member_id: props.member.id,
  };
  const whereStatus: Prisma.multi_user_todo_app_member_sessionsWhereInput =
    props.body.status === "active"
      ? { expired_at: { gte: new Date() } }
      : props.body.status === "expired"
        ? { expired_at: { lt: new Date() } }
        : {};
  const whereDate: Prisma.multi_user_todo_app_member_sessionsWhereInput = {
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
  };
  const whereDevice: Prisma.multi_user_todo_app_member_sessionsWhereInput =
    props.body.deviceId
      ? {
          href: { contains: props.body.deviceId, mode: "insensitive" as const },
        }
      : {};
  const whereIp: Prisma.multi_user_todo_app_member_sessionsWhereInput = props
    .body.ipAddress
    ? {
        ip: { contains: props.body.ipAddress, mode: "insensitive" as const },
      }
    : {};
  const whereInput: Prisma.multi_user_todo_app_member_sessionsWhereInput = {
    ...whereMember,
    ...whereStatus,
    ...whereDate,
    ...whereDevice,
    ...whereIp,
  };
  const orderByInput: Prisma.multi_user_todo_app_member_sessionsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_app_member_sessions.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...MultiUserTodoAppMemberSessionTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_app_member_sessions.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoAppMemberSessionTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
