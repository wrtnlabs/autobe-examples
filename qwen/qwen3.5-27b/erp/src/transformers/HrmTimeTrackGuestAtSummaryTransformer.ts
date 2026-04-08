import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackGuest";
import { IHrmTimeTrackOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackOrganization";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackOrganizationAtSummaryTransformer } from "./HrmTimeTrackOrganizationAtSummaryTransformer";
import { HrmTimeTrackRoleAtSummaryTransformer } from "./HrmTimeTrackRoleAtSummaryTransformer";

export namespace HrmTimeTrackGuestAtSummaryTransformer {
  export type Payload = Prisma.hrm_time_track_guestsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        status: true,
        expires_at: true,
        created_at: true,
        deleted_at: true,
        organization: HrmTimeTrackOrganizationAtSummaryTransformer.select(),
        role: HrmTimeTrackRoleAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_time_track_guestsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackGuest.ISummary> {
    return {
      id: input.id,
      email: input.email,
      status: input.status,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      organization:
        await HrmTimeTrackOrganizationAtSummaryTransformer.transform(
          input.organization,
        ),
      role: await HrmTimeTrackRoleAtSummaryTransformer.transform(input.role),
    };
  }
}
