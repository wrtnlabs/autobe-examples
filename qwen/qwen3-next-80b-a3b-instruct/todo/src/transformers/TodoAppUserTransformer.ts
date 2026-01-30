import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppUserTransformer {
  export type Payload = Prisma.todo_app_usersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.todo_app_usersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppUser> {
    return {
      email: input.email,
      username: input.email, // Use email as username since it's the only available unique identifier
      email_verified: input.email_verified,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      id: input.id,
    };
  }
}
