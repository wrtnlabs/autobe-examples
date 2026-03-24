import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { TodoAppUserProfileTransformer } from "./TodoAppUserProfileTransformer";

export namespace TodoAppMemberAtSummaryTransformer {
  export type Payload = Prisma.todo_app_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        userProfile: TodoAppUserProfileTransformer.select(),
        todos: true,
      },
    } satisfies Prisma.todo_app_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      profile: input.userProfile
        ? await TodoAppUserProfileTransformer.transform(input.userProfile)
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
