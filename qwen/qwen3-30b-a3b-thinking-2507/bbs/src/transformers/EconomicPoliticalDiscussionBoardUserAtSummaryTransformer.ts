import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicPoliticalDiscussionBoardUserAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_usersGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        role: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordReset: true,
        emailVerifications: true,
        articles: true,
        comments: true,
        adminRequests: true,
        bans: true,
        appliedBans: true,
        profile: {
          select: {
            display_name: true,
          },
        } satisfies Prisma.economic_political_discussion_board_profilesFindFirstArgs,
      },
    } satisfies Prisma.economic_political_discussion_board_usersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardUser.ISummary> {
    return {
      id: input.id,
      role: input.role,
      displayName: input.profile?.display_name ?? undefined,
    };
  }
}
