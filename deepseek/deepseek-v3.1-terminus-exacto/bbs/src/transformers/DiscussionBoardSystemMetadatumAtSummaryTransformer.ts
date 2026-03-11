import { IDiscussionBoardSystemMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemMetadatumAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_system_metadataGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        value: true,
        data_type: true,
        scope: true,
        description: true,
        version: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        statusType: {
          select: {
            id: true,
          },
        } satisfies Prisma.discussion_board_status_typesFindManyArgs,
      },
    } satisfies Prisma.discussion_board_system_metadataFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemMetadatum.ISummary> {
    return {
      id: input.id,
      name: input.name,
      value: input.value,
      data_type: input.data_type,
      scope: input.scope,
      status_type_id: input.statusType.id,
    };
  }
}
