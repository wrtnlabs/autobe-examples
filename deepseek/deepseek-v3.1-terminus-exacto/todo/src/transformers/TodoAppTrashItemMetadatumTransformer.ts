import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTrashItemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTrashItemMetadatum";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace TodoAppTrashItemMetadatumTransformer {
  export type Payload = Prisma.todo_app_trash_item_metadataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        cleanup_eligible: true,
        retention_expires_at: true,
        cleanup_scheduled_at: true,
        manual_cleanup_requested: true,
        cleanup_processed_at: true,
        trashItem: {
          select: {
            id: true,
          },
        } satisfies Prisma.todo_app_trash_itemsFindManyArgs,
      },
    } satisfies Prisma.todo_app_trash_item_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ITodoAppTrashItemMetadatum> {
    return {
      id: input.id,
      cleanup_eligible: input.cleanup_eligible,
      retention_expires_at: input.retention_expires_at.toISOString(),
      cleanup_scheduled_at: input.cleanup_scheduled_at?.toISOString() ?? null,
      manual_cleanup_requested: input.manual_cleanup_requested,
      cleanup_processed_at: input.cleanup_processed_at?.toISOString() ?? null,
      todo_app_trash_item_id: input.trashItem.id,
    };
  }
}
