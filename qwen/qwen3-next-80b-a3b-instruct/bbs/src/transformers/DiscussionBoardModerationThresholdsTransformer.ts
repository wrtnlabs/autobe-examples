import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardModerationThresholds } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationThresholds";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardModerationThresholdsTransformer {
  export type Payload = Prisma.discussion_board_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      where: {
        id: 1,
      },
      select: {
        id: true,
        key: true,
        value: true,
        description: true,
        is_enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_configurationsFindUniqueArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardModerationThresholds> {
    const getThreshold = (key: string) => {
      if (input && input.key === key && input.is_enabled) {
        return Number(input.value);
      }
      return 0;
    };
    return {
      commentThreshold: getThreshold("commentThreshold"),
      postThreshold: getThreshold("postThreshold"),
      attachmentThreshold: getThreshold("attachmentThreshold"),
      reviewThreshold: getThreshold("reviewThreshold"),
      warningThreshold: getThreshold("warningThreshold"),
      suspensionThreshold: getThreshold("suspensionThreshold"),
      banThreshold: getThreshold("banThreshold"),
      reportThreshold: getThreshold("reportThreshold"),
    };
  }
}
