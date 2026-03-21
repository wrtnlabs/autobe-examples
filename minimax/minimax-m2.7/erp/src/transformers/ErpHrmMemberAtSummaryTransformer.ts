import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmMemberAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_membersGetPayload<
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
        phone: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        memberSessions: true,
        passwordResets: true,
        emailVerifications: true,
        ownedOrganization: true,
        activityLogs: true,
        generatedReports: true,
        employees: true,
        taskHistories: true,
      },
    } satisfies Prisma.erp_hrm_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      avatarUri: input.avatar_uri ?? undefined,
      phone: input.phone ?? undefined,
      createdAt: input.created_at.toISOString(),
    };
  }
}
