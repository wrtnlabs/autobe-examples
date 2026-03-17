import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserProfileTransformer } from "./TodoAppUserProfileTransformer";

export namespace TodoAppMemberTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: TodoAppUserProfileTransformer.select(),
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoAppMember> {
    return {
      id: input.id,
      email: input.email,
      profile: (input.profile !== null
        ? await TodoAppUserProfileTransformer.transform(input.profile)
        : null) as ITodoAppUserProfile,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at:
        input.deleted_at !== null ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
