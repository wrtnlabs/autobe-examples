import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppSecurityPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSecurityPolicy";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppSecurityPolicyAtSummaryTransformer {
  export type Payload = Prisma.todo_app_security_policiesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_security_policiesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppSecurityPolicy.ISummary> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      description: input.description,
      active: input.active,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
