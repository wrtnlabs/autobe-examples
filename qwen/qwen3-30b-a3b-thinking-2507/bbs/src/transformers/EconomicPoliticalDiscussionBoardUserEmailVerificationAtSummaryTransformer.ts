import { IEconomicPoliticalDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUser";
import { IEconomicPoliticalDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { EconomicPoliticalDiscussionBoardUserAtSummaryTransformer } from "./EconomicPoliticalDiscussionBoardUserAtSummaryTransformer";

export namespace EconomicPoliticalDiscussionBoardUserEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.economic_political_discussion_board_user_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        verified: true,
        user: EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.select(),
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.economic_political_discussion_board_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicPoliticalDiscussionBoardUserEmailVerification.ISummary> {
    return {
      id: input.id,
      token: input.token,
      expires_at: input.expires_at.toISOString(),
      verified: input.verified,
      created_at: input.created_at.toISOString(),
      user: await EconomicPoliticalDiscussionBoardUserAtSummaryTransformer.transform(
        input.user,
      ),
    };
  }
}
