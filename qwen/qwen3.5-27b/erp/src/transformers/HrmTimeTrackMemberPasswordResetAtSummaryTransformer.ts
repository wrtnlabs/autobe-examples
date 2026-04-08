import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";

export namespace HrmTimeTrackMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        deleted_at: true,
        member: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      token: input.token,
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
      member: await HrmTimeTrackMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
