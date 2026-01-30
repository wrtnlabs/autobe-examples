import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEconomicForumEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicForumEmailVerification";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EconomicForumEmailVerificationTransformer {
  export type Payload =
    Prisma.economic_forum_admin_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        deleted_at: true,
        admin: true,
      },
    } satisfies Prisma.economic_forum_admin_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IEconomicForumEmailVerification> {
    return {
      id: input.id,
      admin_id: input.admin.id,
      created_at: toISOStringSafe(input.created_at),
      expires_at: toISOStringSafe(input.expires_at),
      status: input.deleted_at ? "consumed" : "pending",
    };
  }
}
