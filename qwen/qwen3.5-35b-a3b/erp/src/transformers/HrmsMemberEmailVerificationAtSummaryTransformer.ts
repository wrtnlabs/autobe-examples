import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsMemberEmailVerificationAtSummaryTransformer {
  export type Payload = Prisma.hrms_member_email_verificationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: {
          select: {
            email: true,
            display_name: true,
          },
        } satisfies Prisma.hrms_membersFindManyArgs,
      },
    } satisfies Prisma.hrms_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsMemberEmailVerification.ISummary> {
    const now = new Date();
    const status: "active" | "used" | "expired" = input.used_at
      ? "used"
      : input.expires_at > now
        ? "active"
        : "expired";
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
