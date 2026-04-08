import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackMember";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { IHrmTimeTrackRoleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRoleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackMemberAtSummaryTransformer } from "./HrmTimeTrackMemberAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackRoleSnapshotAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_role_snapshotsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        name: true,
        description: true,
        is_builtin: true,
        created_at: true,
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
        createdByMember: HrmTimeTrackMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_role_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackRoleSnapshot.ISummary> {
    return {
      id: input.id,
      name: input.name,
      description: input.description,
      is_builtin: input.is_builtin,
      created_at: input.created_at.toISOString(),
      role: await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role),
      createdByMember: input.createdByMember
        ? await HrmTimeTrackMemberAtSummaryTransformer.transform(
            input.createdByMember,
          )
        : null,
    };
  }
}
