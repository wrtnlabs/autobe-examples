import { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdministratorAtRoleUpdateTransformer {
  export type Payload = Prisma.discussion_board_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        grade: {
          select: {},
        },
        sessions: true,
        passwordResets: true,
        sectionAdminLogs: true,
        gradeChanges: true,
        promotions: true,
        issuedBans: true,
        userUnbans: true,
      },
    } satisfies Prisma.discussion_board_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload & {
      action: "promote" | "demote";
    },
  ): Promise<IDiscussionBoardSuperAdministrator.IRoleUpdate> {
    return {
      administratorId: input.id,
      action: input.action,
    };
  }
}
