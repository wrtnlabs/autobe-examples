import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardAdministratorGradeTransformer {
  export type Payload = Prisma.discussion_board_administrator_gradesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        level: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        administrators: true,
        gradeChanges: true,
        oldGradePromotions: true,
        newGradePromotions: true,
      },
    } satisfies Prisma.discussion_board_administrator_gradesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministratorGrade> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      level: input.level,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
