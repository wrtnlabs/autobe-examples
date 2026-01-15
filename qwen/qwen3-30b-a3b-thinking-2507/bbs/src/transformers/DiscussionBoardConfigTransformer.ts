import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardConfigTransformer {
  export type Payload = Prisma.discussion_board_configsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_configsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardConfig> {
    return {
      configCode: input.key,
      configValue: input.value,
      description: undefined,
    };
  }
}
