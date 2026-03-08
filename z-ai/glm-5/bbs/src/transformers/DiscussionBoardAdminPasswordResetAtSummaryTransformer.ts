import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardAdminPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_admin_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expired_at: true,
        created_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      expiredAt: input.expired_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
