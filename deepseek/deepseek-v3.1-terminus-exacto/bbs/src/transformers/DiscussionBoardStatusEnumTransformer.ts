import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardStatusEnumTransformer {
  export type Payload = Prisma.discussion_board_status_enumsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        entity_type: true,
        value: true,
        description: true,
        sort_order: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        snapshots: true,
        statusEnumReferences: true,
      },
    } satisfies Prisma.discussion_board_status_enumsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusEnum> {
    return {
      id: input.id,
      entity_type: input.entity_type,
      value: input.value,
      description: input.description,
      sort_order: input.sort_order,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
