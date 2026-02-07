import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoUserAtSummaryTransformer } from "./TodoUserAtSummaryTransformer";

export namespace TodoTodoTransformer {
    export type Payload = Prisma.todo_todosGetPayload<ReturnType<typeof select>>;
    export function select() {
        return {
            select: {
                id: true,
                title: true,
                description: true,
                start_date: true,
                due_date: true,
                is_completed: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                user: TodoUserAtSummaryTransformer.select(),
            },
            satisfies, Prisma, : .todo_todosFindManyArgs
        };
        export async function transform(input: Payload): Promise<ITodoTodo> {
            return {
                id: input.id,
                title: input.title,
                description: input.description ?? undefined,
                start_date: toISOStringSafe(input.start_date),
                due_date: toISOStringSafe(input.due_date),
                is_completed: input.is_completed,
                created_at: toISOStringSafe(input.created_at),
                updated_at: toISOStringSafe(input.updated_at),
                deleted_at: toISOStringSafe(input.deleted_at),
                user: await TodoUserAtSummaryTransformer.transform(input.user),
            };
        }
    }
}