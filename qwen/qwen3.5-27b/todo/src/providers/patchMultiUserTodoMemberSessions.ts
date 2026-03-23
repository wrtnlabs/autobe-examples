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

export async function patchMultiUserTodoMemberSessions(props: {
  member: {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
  };
  body: IMultiUserTodoMemberSession.IRequest;
}): Promise<IPageIMultiUserTodoMemberSession.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where condition with member ID filter
  const whereInput: Prisma.multi_user_todo_member_sessionsWhereInput = {
    multi_user_todo_member_id: props.member.id,
  };
  // Apply status filter
  if (props.body.status === "active") {
    (whereInput as any).expired_at = {
      gte: new Date().toISOString(),
    };
  } else if (props.body.status === "expired") {
    (whereInput as any).expired_at = {
      lte: new Date().toISOString(),
    };
  }
  // Apply date range filters
  if (props.body.startDate) {
    whereInput.created_at = {
      gte: props.body.startDate,
    };
  }
  if (props.body.endDate) {
    if (!("created_at" in whereInput)) {
      (whereInput as any).created_at = {};
    }
    (whereInput as any).created_at.lte = props.body.endDate;
  }
  // Apply IP filter (partial match)
  if (props.body.ip) {
    if (!("AND" in whereInput)) {
      (whereInput as any).AND = [];
    }
    (whereInput as any).AND.push({
      ip: {
        contains: props.body.ip,
      },
    });
  }
  // Build orderBy clause
  const orderByInput: Prisma.multi_user_todo_member_sessionsOrderByWithRelationInput =
    {};
  const sortBy = props.body.sortBy || "created_at";
  const sortOrder = (props.body.sortOrder || "desc") === "asc" ? "asc" : "desc";
  if (sortBy === "created_at") {
    orderByInput[sortBy] = sortOrder;
  } else if (sortBy === "expired_at") {
    orderByInput[sortBy] = sortOrder;
  } else if (sortBy === "ip") {
    orderByInput[sortBy] = sortOrder;
  }
  // Execute queries in parallel
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
  const totalRecords = total;
  const totalPages = Math.ceil(totalRecords / limit);
  const transformedData = await Promise.all(
    data.map((row) =>
      MultiUserTodoMemberSessionAtSummaryTransformer.transform(row),
    ),
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: totalPages,
    },
    data: transformedData,
  };
}
