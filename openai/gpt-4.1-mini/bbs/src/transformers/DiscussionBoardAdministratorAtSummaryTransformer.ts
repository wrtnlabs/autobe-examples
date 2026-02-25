import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_administratorsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        grade: {
          select: {
            id: true,
            name: true,
            level: true,
          },
        },
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: {
            id: true,
          },
        },
        passwordResets: {
          select: {
            id: true,
          },
        },
        sectionAdminLogs: {
          select: {
            id: true,
          },
        },
        gradeChanges: {
          select: {
            id: true,
          },
        },
        promotions: {
          select: {
            id: true,
          },
        },
        issuedBans: {
          select: {
            id: true,
          },
        },
        userUnbans: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      grade: {
        id: input.grade.id,
        name: input.grade.name,
        level: input.grade.level,
      } satisfies IDiscussionBoardAdministratorGrade.ISummary,
      created_at: toISOStringSafe(
        input.created_at ?? new Date(),
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(
        input.updated_at ?? new Date(),
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
      deleted_at: toISOStringSafe(
        input.deleted_at ?? new Date(),
      ) satisfies string & tags.Format<"date-time"> as string &
        tags.Format<"date-time">,
    };
  }
}
