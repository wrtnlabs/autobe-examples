import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmTrackerMemberTransformer {
  export type Payload = Prisma.hrm_tracker_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        display_name: true,
        avatar_url: true,
        phone: true,
        status: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_tracker_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IHrmTrackerMember> {
    return {
      id: input.id,
      email: input.email,
      display_name: input.display_name,
      avatar_url: input.avatar_url ?? undefined,
      phone: input.phone ?? undefined,
      status: typia.assert<"active" | "deactivated">(input.status),
      email_verified: input.email_verified,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at
        ? toISOStringSafe(input.deleted_at)
        : undefined,
    };
  }
}
