import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardDataRetentionPolicyAtSummaryTransformer } from "./DiscussionBoardDataRetentionPolicyAtSummaryTransformer";

export namespace DiscussionBoardDataRetentionPolicyDataTypeTransformer {
  export type Payload =
    Prisma.discussion_board_data_retention_policy_data_typesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        data_type: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        retentionPolicy:
          DiscussionBoardDataRetentionPolicyAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_data_retention_policy_data_typesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardDataRetentionPolicyDataType> {
    return {
      id: input.id,
      data_type: input.data_type,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      retentionPolicy:
        await DiscussionBoardDataRetentionPolicyAtSummaryTransformer.transform(
          input.retentionPolicy,
        ),
    };
  }
}
