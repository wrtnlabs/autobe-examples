import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
        display_name: true,
        bio: true,
        grade: true,
        created_at: true,
        updated_at: true,
        password_hash: true,
        deleted_at: true,
        session: true,
        passwordResets: true,
        reviewedAdminRequests: true,
        adminRequestDecisions: true,
        bansImposeds: true,
        banRecords: true,
      },
    } satisfies Prisma.discussion_board_administratorsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdministrator.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      grade: input.grade,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
