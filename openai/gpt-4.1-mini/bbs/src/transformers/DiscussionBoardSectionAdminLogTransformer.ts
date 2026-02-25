import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdministratorAtSummaryTransformer } from "./DiscussionBoardAdministratorAtSummaryTransformer";

export namespace DiscussionBoardSectionAdminLogTransformer {
  export type Payload = Prisma.discussion_board_section_admin_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrator:
          DiscussionBoardAdministratorAtSummaryTransformer.select(),
        section: {
          select: {
            id: true,
            name: true,
            description: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_section_admin_logsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionAdminLog> {
    return {
      id: input.id,
      actionType: input.action_type,
      note: input.note ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at ? input.deleted_at.toISOString() : null,
      administrator:
        await DiscussionBoardAdministratorAtSummaryTransformer.transform(
          input.administrator,
        ),
      section: {
        id: input.section.id,
        name: input.section.name,
        description: input.section.description ?? null,
        createdAt: input.section.created_at.toISOString(),
        updatedAt: input.section.updated_at.toISOString(),
        deletedAt: input.section.deleted_at
          ? input.section.deleted_at.toISOString()
          : null,
      },
    };
  }
}
