import { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardStatusEnumAtSummaryTransformer } from "./DiscussionBoardStatusEnumAtSummaryTransformer";

export namespace DiscussionBoardStatusEnumReferenceAtSummaryTransformer {
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
        statusEnum: DiscussionBoardStatusEnumAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_status_enum_referencesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardStatusEnumReference.ISummary> {
    return {
      id: input.id,
      referenced_table: input.referenced_table,
      referenced_column: input.referenced_column,
      statusEnum: await DiscussionBoardStatusEnumAtSummaryTransformer.transform(
        input.statusEnum,
      ),
    };
  }
}
