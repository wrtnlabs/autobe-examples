import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardStatusEnumReferenceTransformer {
  export type Payload =
    Prisma.discussion_board_status_enum_referencesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        referenced_table: true,
        referenced_column: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        statusEnum: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_status_enumsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_status_enum_referencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusEnumReference> {
    return {
      id: input.id,
      discussion_board_status_enums_id: input.statusEnum.id,
      referenced_table: input.referenced_table,
      referenced_column: input.referenced_column,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
