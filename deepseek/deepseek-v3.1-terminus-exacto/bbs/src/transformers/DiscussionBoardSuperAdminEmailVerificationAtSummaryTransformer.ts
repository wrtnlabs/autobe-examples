import { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.discussion_board_super_admin_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token_hash: true,
        expired_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        superAdmin: {
          select: {
            email: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_super_admin_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdminEmailVerification.ISummary> {
    return {
      id: input.id,
      super_admin_email: input.superAdmin.email,
      verification_status: input.verified_at === null ? "pending" : "completed",
      created_at: toISOStringSafe(input.created_at),
      expired_at: toISOStringSafe(input.expired_at),
      verified_at: input.verified_at
        ? toISOStringSafe(input.verified_at)
        : null,
    };
  }
}
