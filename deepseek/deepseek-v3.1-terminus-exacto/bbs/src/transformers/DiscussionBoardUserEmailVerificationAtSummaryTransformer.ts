import { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardUserEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_user_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        expires_at: true,
        verified_at: true,
        created_at: true,
      },
    } satisfies Prisma.discussion_board_user_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardUserEmailVerification.ISummary> {
    return {
      id: input.id,
      expires_at: input.expires_at.toISOString(),
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
    };
  }
}
