import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsMemberEmailVerificationAtSummaryTransformer {
  export type Payload = Prisma.hrms_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        member: {
          select: {
            email: true,
            display_name: true,
          },
        },
      },
    } satisfies Prisma.hrms_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsMemberEmailVerification.ISummary> {
    const now = new Date();
    const status: "active" | "used" | "expired" = input.used_at
      ? "used"
      : input.expires_at <= now
        ? "expired"
        : "active";
    return {
      id: input.id,
      expires_at: input.expires_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      member_email: input.member.email,
      member_display_name: input.member.display_name,
      status,
    };
  }
}
