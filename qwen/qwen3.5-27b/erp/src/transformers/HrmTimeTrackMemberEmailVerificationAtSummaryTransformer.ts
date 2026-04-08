import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberEmailVerification";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";

export namespace HrmTimeTrackMemberEmailVerificationAtSummaryTransformer {
  export type Payload =
    Prisma.hrm_time_track_member_email_verificationsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
        email: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_track_member_email_verificationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackMemberEmailVerification.ISummary> {
    const now = new Date();
    const expiredAt = new Date(input.expired_at);
    let status: "unused" | "used" | "expired";
    if (input.used_at) {
      status = "used";
    } else if (expiredAt <= now) {
      status = "expired";
    } else {
      status = "unused";
    }
    return {
      id: input.id,
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
      email: input.email,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      deleted_at: input.deleted_at?.toISOString() ?? null,
      status,
    };
  }
}
