import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardConfigurationTransformer {
  export type Payload = Prisma.discussion_board_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
    } satisfies Prisma.discussion_board_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardConfiguration> {
    return {
      key: input.key,
      value: input.value,
      description: input.description ?? "",
      createdAt: input.created_at.toISOString(),
      createdBy: "",
      updatedBy: "",
    };
  }
}
