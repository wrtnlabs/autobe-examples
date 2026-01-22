import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppConfigurationAtSummaryTransformer {
  export type Payload = Prisma.todo_app_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        type: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.todo_app_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppConfiguration.ISummary> {
    return {
      id: input.id,
      key: input.key,
      value: input.value,
      type: input.type,
      description: input.description,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
