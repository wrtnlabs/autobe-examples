import { IDiscussionBoardDataRetentionPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicy";
import { IDiscussionBoardDataRetentionPolicyDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDataRetentionPolicyDataType";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardDataRetentionPolicyAtSummaryTransformer } from "./DiscussionBoardDataRetentionPolicyAtSummaryTransformer";

export namespace DiscussionBoardDataRetentionPolicyDataTypeAtSummaryTransformer {
  // 1. Payload type first
  export type Payload =
    Prisma.discussion_board_data_retention_policy_data_typesGetPayload<
      ReturnType<typeof select>
    >;
  // 2. select() function second
  export function select() {
    return {
      select: {
        id: true,
        data_type: true,
        created_at: true,
        retentionPolicy:
          DiscussionBoardDataRetentionPolicyAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_data_retention_policy_data_typesFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardDataRetentionPolicyDataType.ISummary> {
    return {
      id: input.id,
      data_type: input.data_type,
      created_at: input.created_at.toISOString(),
      retentionPolicy:
        await DiscussionBoardDataRetentionPolicyAtSummaryTransformer.transform(
          input.retentionPolicy,
        ),
    };
  }
}
