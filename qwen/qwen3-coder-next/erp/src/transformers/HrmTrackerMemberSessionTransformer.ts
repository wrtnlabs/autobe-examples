import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMemberSession";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTrackerMemberAtSummaryTransformer } from "./HrmTrackerMemberAtSummaryTransformer";

export namespace HrmTrackerMemberSessionTransformer {
  export type Payload = Prisma.hrm_tracker_member_sessionsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        access_token: true,
        refresh_token: true,
        ip: true,
        user_agent: true,
        created_at: true,
        expires_at: true,
        revoked_at: true,
        last_activity_at: true,
        member: HrmTrackerMemberAtSummaryTransformer.select(),
        sentInvitations: {
          select: { id: true },
        } satisfies Prisma.hrm_tracker_member_sessionsFindManyArgs,
      },
    } satisfies Prisma.hrm_tracker_member_sessionsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTrackerMemberSession> {
    return {
      id: input.id,
      access_token: input.access_token,
      refresh_token: input.refresh_token,
      ip: input.ip,
      user_agent: input.user_agent ?? null,
      created_at: input.created_at.toISOString(),
      expires_at: input.expires_at.toISOString(),
      revoked_at: input.revoked_at?.toISOString() ?? null,
      last_activity_at: input.last_activity_at.toISOString(),
      member: await HrmTrackerMemberAtSummaryTransformer.transform(
        input.member,
      ),
    };
  }
}
