import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeMemberTransformer {
  export type Payload = Prisma.erp_hrm_time_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_image_url: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        organizationMemberships: true,
        employees: true,
        ownedOrganizations: true,
        taskHistoryEntries: true,
        timelogs: true,
        timers: true,
        reviewedTimesheets: true,
        activityLogEntries: true,
      },
    } satisfies Prisma.erp_hrm_time_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimeMember> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      avatarImageUrl: input.avatar_image_url,
      phoneNumber: input.phone_number,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
