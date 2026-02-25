import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardAdminAtSummaryTransformer } from "./DiscussionBoardAdminAtSummaryTransformer";

export namespace DiscussionBoardAdminEmailVerificationTransformer {
  export type Payload =
    Prisma.discussion_board_admin_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        email: true,
        expired_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        admin: DiscussionBoardAdminAtSummaryTransformer.select(),
      },
    } satisfies Prisma.discussion_board_admin_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardAdminEmailVerification> {
    return {
      id: input.id,
      token: input.token,
      email: input.email,
      expired_at: input.expired_at.toISOString(),
      verified_at: input.verified_at ? input.verified_at.toISOString() : null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      discussion_board_admin_id: input.admin.id,
      admin: await DiscussionBoardAdminAtSummaryTransformer.transform(
        input.admin,
      ),
    };
  }
}
