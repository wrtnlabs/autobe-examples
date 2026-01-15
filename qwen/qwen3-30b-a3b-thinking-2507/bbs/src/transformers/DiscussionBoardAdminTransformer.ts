import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdminTransformer {
  export type Payload = Prisma.discussion_board_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        deleted_at: true,
      },
    } satisfies Prisma.discussion_board_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdmin> {
    return {
      id: input.id,
      email: input.email,
      status: input.deleted_at ? "inactive" : "active",
    };
  }
}
