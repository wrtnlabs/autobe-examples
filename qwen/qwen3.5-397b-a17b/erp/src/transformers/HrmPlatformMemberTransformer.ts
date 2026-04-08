import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformUserProfileTransformer } from "./HrmPlatformUserProfileTransformer";

export namespace HrmPlatformMemberTransformer {
  export type Payload = Prisma.hrm_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: { select: {} },
        passwordResets: { select: {} },
        emailVerifications: { select: {} },
        organizationMemberships: { select: {} },
        profile: HrmPlatformUserProfileTransformer.select(),
        employees: { select: {} },
        sentInvitations: { select: {} },
        taskHistories: { select: {} },
        reviewedTimesheets: { select: {} },
        activityLogs: { select: {} },
      },
    } satisfies Prisma.hrm_platform_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmPlatformMember> {
    return {
      id: input.id,
      email: input.email,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      profile: input.profile
        ? await HrmPlatformUserProfileTransformer.transform(input.profile)
        : null,
    } satisfies IHrmPlatformMember;
  }
}
