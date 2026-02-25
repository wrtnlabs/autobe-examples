import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IDiscussionBoardSuperAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSuperAdminEmailVerificationTransformer {
  export type Payload =
    Prisma.discussion_board_super_admin_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        expired_at: true,
        verified_at: true,
        created_at: true,
        updated_at: true,
        superAdmin: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.discussion_board_super_admin_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSuperAdminEmailVerification> {
    const superAdmin = input.superAdmin;
    return {
      id: input.id,
      expired_at: toISOStringSafe(input.expired_at),
      verified_at: input.verified_at
        ? toISOStringSafe(input.verified_at)
        : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      superAdmin: {
        id: superAdmin.id,
        permission_level: typia.assert<"admin" | "user">("admin"),
        assignment_date: toISOStringSafe(new Date()),
        admin: null,
        superAdmin: null,
      },
    };
  }
}
