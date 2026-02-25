import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardSectionTransformer {
  export type Payload = Prisma.discussion_board_sectionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        display_order: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        createdByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
        lastModifiedByAdmin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_sectionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSection> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      status: input.status,
      display_order: input.display_order,
      createdByAdmin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.createdByAdmin,
      ),
      lastModifiedByAdmin: input.lastModifiedByAdmin
        ? await DiscussionBoardAdminAtSummaryTransformer.transform(
            input.lastModifiedByAdmin,
          )
        : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
