import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformInvitation } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformInvitation";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformMemberAtSummaryTransformer } from "./HrmPlatformMemberAtSummaryTransformer";

export namespace HrmPlatformInvitationAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_invitationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        invited_at: true,
        expires_at: true,
        accepted_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        user: true,
        invitedBy: HrmPlatformMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_invitationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformInvitation.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: typia.assert<"pending" | "accepted" | "expired" | "revoked">(
        input.status,
      ),
      invited_at: toISOStringSafe(input.invited_at),
      expires_at: toISOStringSafe(input.expires_at),
      accepted_at: input.accepted_at
        ? toISOStringSafe(input.accepted_at)
        : null,
      invited_by: await HrmPlatformMemberAtSummaryTransformer.transform(
        input.invitedBy,
      ),
    };
  }
}
