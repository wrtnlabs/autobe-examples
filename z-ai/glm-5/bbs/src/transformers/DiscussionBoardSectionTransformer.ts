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
        sequence: true,
        created_at: true,
        updated_at: true,
        creator: DiscussionBoardAdminAtSummaryTransformer.select(),
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
      sequence: input.sequence,
      creator: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.creator,
      ),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
