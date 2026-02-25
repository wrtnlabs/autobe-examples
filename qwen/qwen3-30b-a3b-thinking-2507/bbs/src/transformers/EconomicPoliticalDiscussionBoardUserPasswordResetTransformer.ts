import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardUserPasswordResetTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_user_password_resetsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
      },
    } satisfies Prisma.economic_political_discussion_board_user_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardUserPasswordReset> {
    return {
      user: await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
