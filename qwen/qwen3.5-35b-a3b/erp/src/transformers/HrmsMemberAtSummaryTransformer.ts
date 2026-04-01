import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsMemberAtSummaryTransformer {
  export type Payload = Prisma.hrms_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_uri: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberSessions: { select: { id: true } },
        passwordResets: { select: { id: true } },
        emailVerifications: { select: { id: true } },
        activityLogsPerformeds: { select: { id: true } },
        ownedOrganizations: { select: { id: true } },
        organizationMembers: { select: { id: true } },
        taskStatusHistories: { select: { id: true } },
        reviewedTimesheets: { select: { id: true } },
        files: { select: { id: true } },
        fileUploads: { select: { id: true } },
      },
    } satisfies Prisma.hrms_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmsMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_uri: input.avatar_uri ?? null,
      phone_number: input.phone_number ?? null,
      organization_membership_count: input.organizationMembers.length,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
