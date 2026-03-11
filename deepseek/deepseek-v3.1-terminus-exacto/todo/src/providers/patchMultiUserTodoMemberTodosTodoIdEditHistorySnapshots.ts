import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoEditHistorySnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoEditHistorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoEditHistorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoEditHistorySnapshotAtSummaryTransformer } from "../transformers/MultiUserTodoEditHistorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdEditHistorySnapshots(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoEditHistorySnapshot.IRequest;
}): Promise<IPageIMultiUserTodoEditHistorySnapshot.ISummary> {
  // 1. Verify todo exists and belongs to authenticated member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
      deleted_at: null,
    },
  });
  // 2. Build WHERE clause for snapshots
  const whereClause: Prisma.multi_user_todo_edit_history_snapshotsWhereInput = {
    multi_user_todo_todo_id: props.todoId,
  };
  // 3. Apply date filters if provided
  if (props.body.created_after !== undefined) {
    whereClause.created_at = {
      gte: new Date(props.body.created_after),
    };
  }
  if (props.body.created_before !== undefined) {
    if (
      whereClause.created_at &&
      typeof whereClause.created_at === "object" &&
      !(whereClause.created_at instanceof Date)
    ) {
      whereClause.created_at = {
        ...whereClause.created_at,
        lte: new Date(props.body.created_before),
      };
    } else {
      whereClause.created_at = {
        lte: new Date(props.body.created_before),
      };
    }
  }
  if (props.body.updated_after !== undefined) {
    whereClause.updated_at = {
      gte: new Date(props.body.updated_after),
    };
  }
  if (props.body.updated_before !== undefined) {
    if (
      whereClause.updated_at &&
      typeof whereClause.updated_at === "object" &&
      !(whereClause.updated_at instanceof Date)
    ) {
      whereClause.updated_at = {
        ...whereClause.updated_at,
        lte: new Date(props.body.updated_before),
      };
    } else {
      whereClause.updated_at = {
        lte: new Date(props.body.updated_before),
      };
    }
  }
  // 4. Calculate pagination with validation
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  if (page < 1 || skip < 0) {
    throw new HttpException("Invalid page number", 400);
  }
  // 5. Fetch paginated snapshots
  const snapshots =
    await MyGlobal.prisma.multi_user_todo_edit_history_snapshots.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...MultiUserTodoEditHistorySnapshotAtSummaryTransformer.select(),
    });
  // 6. Count total matching records
  const total =
    await MyGlobal.prisma.multi_user_todo_edit_history_snapshots.count({
      where: whereClause,
    });
  // 7. Transform snapshots to DTO format
  const transformed = await ArrayUtil.asyncMap(
    snapshots,
    MultiUserTodoEditHistorySnapshotAtSummaryTransformer.transform,
  );
  // 8. Return paginated response
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    } satisfies IPage.IPagination,
  };
}
