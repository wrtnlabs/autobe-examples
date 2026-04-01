import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        avatar_image: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        employees: true,
        employeeSnapshots: true,
        taskHistories: true,
        reviewedTimesheets: true,
        activityLogs: true,
      },
    } satisfies Prisma.hrm_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_image: input.avatar_image ?? null,
      phone_number: input.phone_number ?? null,
    };
  }
}
