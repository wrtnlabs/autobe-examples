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
        display_name: true,
        avatar_url: true,
        phone_number: true,
        created_at: true,
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
      avatar_url: input.avatar_url ?? null,
      phone_number: input.phone_number ?? null,
      created_at: input.created_at.toISOString(),
    };
  }
}
