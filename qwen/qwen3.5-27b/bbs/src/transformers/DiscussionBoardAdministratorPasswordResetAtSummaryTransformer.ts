import { IDiscussionBoardAdministratorPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorPasswordResetAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_administrator_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        token_type: true,
        created_at: true,
        expires_at: true,
        used_at: true,
        updated_at: true,
        administrator: {
          select: {
            id: true,
            email: true,
          },
        } satisfies Prisma.discussion_board_administratorsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_administrator_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorPasswordReset.ISummary> {
    return {
      id: input.id,
      user_type: "administrator",
      user_id: input.administrator.id,
      user_email: input.administrator.email,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      is_used: input.used_at !== null,
      user_agent: null,
      ip_address: null,
    };
  }
}
