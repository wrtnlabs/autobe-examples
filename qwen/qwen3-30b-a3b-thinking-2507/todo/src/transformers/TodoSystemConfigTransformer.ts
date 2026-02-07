import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoSystemConfig";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoSystemConfigTransformer {
  export type Payload = Prisma.todo_system_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email_verification_timeout: true,
        password_reset_timeout: true,
        feature_flags: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_system_configsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ITodoSystemConfig> {
    return {
      id: input.id,
      email_verification_timeout: input.email_verification_timeout,
      password_reset_timeout: input.password_reset_timeout,
      feature_flags: input.feature_flags,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
