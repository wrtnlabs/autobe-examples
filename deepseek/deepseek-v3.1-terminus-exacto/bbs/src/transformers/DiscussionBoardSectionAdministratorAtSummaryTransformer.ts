import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSectionAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdministrator";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";
import { DiscussionBoardSuperAdminAtSummaryTransformer } from "./DiscussionBoardSuperAdminAtSummaryTransformer";

export namespace DiscussionBoardSectionAdministratorAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_section_administratorsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        permission_level: true,
        assignment_date: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
        superAdmin: DiscussionBoardSuperAdminAtSummaryTransformer.select(),
        section: { select: { id: true } },
      },
    } satisfies Prisma.discussion_board_section_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSectionAdministrator.ISummary> {
    return {
      id: input.id,
      permission_level: input.permission_level,
      assignment_date: input.assignment_date.toISOString(),
      admin: input.admin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(input.admin)
        : null,
      superAdmin: input.superAdmin
        ? await DiscussionBoardSuperAdminAtSummaryTransformer.transform(
            input.superAdmin,
          )
        : null,
    };
  }
}
