import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmsMemberProfileTransformer {
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
        memberSessions: true,
        passwordResets: true,
        emailVerifications: true,
        activityLogsPerformeds: true,
        ownedOrganizations: true,
        organizationMembers: true,
        taskStatusHistories: true,
        reviewedTimesheets: true,
        files: true,
        fileUploads: true,
      },
    } satisfies Prisma.hrms_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmsMemberProfile> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_uri: input.avatar_uri ?? null,
      phone_number: input.phone_number ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmsMemberProfile;
  }
}
