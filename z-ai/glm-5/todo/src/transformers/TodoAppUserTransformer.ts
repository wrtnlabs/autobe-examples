import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserTransformer {
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        display_name: true,
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppUser> {
    return {
      display_name: input.display_name,
    };
  }
}
