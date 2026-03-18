import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { IHrmTimeTrackingMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingMemberAtSummaryTransformer } from "./HrmTimeTrackingMemberAtSummaryTransformer";

export namespace HrmTimeTrackingMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expired_at: true,
        verified_at: true,
        updated_at: true,
        deleted_at: true,
        member: HrmTimeTrackingMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_tracking_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingMemberEmailVerification.ISummary> {
    const now = new Date();
    return {
      id: input.id,
      member: await HrmTimeTrackingMemberAtSummaryTransformer.transform(
        input.member,
      ),
      createdAt: input.created_at.toISOString(),
      expiredAt: input.expired_at.toISOString(),
      verifiedAt: input.verified_at?.toISOString() ?? null,
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      status: input.verified_at
        ? "verified"
        : input.expired_at < now
          ? "expired"
          : "pending",
    };
  }
}
