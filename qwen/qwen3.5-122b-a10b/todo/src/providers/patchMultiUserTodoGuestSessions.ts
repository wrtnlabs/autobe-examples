import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMemberSession";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "../transformers/MultiUserTodoMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoGuestSessions(props: {
  guest: GuestPayload;
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.multi_user_todo_member_sessionsWhereInput = {
    deleted_at: null,
  };
  // Build created_at filter without spreading potentially undefined
  if (
    props.body.created_at_from !== undefined &&
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
      lte: new Date(props.body.created_at_to),
    };
  } else if (props.body.created_at_from !== undefined) {
    whereInput.created_at = {
      gte: new Date(props.body.created_at_from),
    };
  } else if (props.body.created_at_to !== undefined) {
    whereInput.created_at = {
      lte: new Date(props.body.created_at_to),
    };
  }
  // Build expired_at filter without spreading potentially undefined
  if (
    props.body.expired_at_from !== undefined &&
    props.body.expired_at_to !== undefined
  ) {
    whereInput.expired_at = {
      gte: new Date(props.body.expired_at_from),
      lte: new Date(props.body.expired_at_to),
    };
  } else if (props.body.expired_at_from !== undefined) {
    whereInput.expired_at = {
      gte: new Date(props.body.expired_at_from),
    };
  } else if (props.body.expired_at_to !== undefined) {
    whereInput.expired_at = {
      lte: new Date(props.body.expired_at_to),
    };
  }
  if (props.body.status !== undefined) {
    const now = new Date();
    if (props.body.status === "active") {
      whereInput.deleted_at = null;
      whereInput.expired_at = { gte: now };
    } else if (props.body.status === "expired") {
      whereInput.deleted_at = null;
      whereInput.expired_at = { lt: now };
    } else if (props.body.status === "deleted") {
      whereInput.deleted_at = { not: null };
    }
  }
  const orderByInput: Prisma.multi_user_todo_member_sessionsOrderByWithRelationInput =
    props.body.sort_by === "created_at"
      ? { created_at: props.body.sort_order === "asc" ? "asc" : "desc" }
      : props.body.sort_by === "expired_at"
        ? { expired_at: props.body.sort_order === "asc" ? "asc" : "desc" }
        : { created_at: "desc" };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...MultiUserTodoMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_member_sessions.count({
      where: whereInput,
    }),
  ]);
  const result: IPageIMultiUserTodoMemberSession.ISummary = {
    data: await ArrayUtil.asyncMap(
      data,
      MultiUserTodoMemberSessionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
  return result;
}
