import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoMemberSessionAtSummaryTransformer } from "../transformers/MultiUserTodoMemberSessionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberMembersSessions(props: {
  member: MemberPayload;
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  const ArrayUtil = (await import("@nestia/e2e")).ArrayUtil;

  // Extract and validate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with ownership validation - using string dates directly
  const whereInput = {
    multi_user_todo_member_id: props.member.id,
    ...(props.body.created_after && {
      created_at: {
        gte: props.body.created_after,
      },
    }),
    ...(props.body.created_before && {
      created_at: {
        lte: props.body.created_before,
      },
    }),
    ...(props.body.ip && {
      ip: {
        contains: props.body.ip.replace(/\/\d+$/, ""), // Remove CIDR suffix for contains
      },
    }),
  } satisfies Prisma.multi_user_todo_member_sessionsWhereInput;
  // Execute paginated query
  const [data, total] = await Promise.all([
    MyGlobal.prisma.multi_user_todo_member_sessions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...MultiUserTodoMemberSessionAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.multi_user_todo_member_sessions.count({
      where: whereInput,
    }),
  ]);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    MultiUserTodoMemberSessionAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
