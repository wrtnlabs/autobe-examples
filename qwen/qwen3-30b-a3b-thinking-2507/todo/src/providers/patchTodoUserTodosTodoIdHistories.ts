import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoHistory";
import { IPageITodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoHistory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";
import { TodoHistoryAtSummaryTransformer } from "../transformers/TodoHistoryAtSummaryTransformer";

export async function patchTodoUserTodosTodoIdHistories(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoHistory.IRequest;
}): Promise<IPageITodoHistory.ISummary> {
  const page = props.body.page ?? 1;
  const size = props.body.size ?? 10;
  const skip = (page - 1) * size;
  const historyEntries = await MyGlobal.prisma.todo_histories.findMany({
    where: {
      todo: {
        id: props.todoId,
        user: {
          id: props.user.id,
        },
      },
      deleted_at: null,
    },
    skip,
    take: size,
    orderBy: {
      created_at: "desc",
    },
    ...TodoHistoryAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.todo_histories.count({
    where: {
      todo: {
        id: props.todoId,
        user: {
          id: props.user.id,
        },
      },
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    historyEntries,
    TodoHistoryAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: size,
      records: total,
      pages: Math.ceil(total / size),
    },
  };
}
