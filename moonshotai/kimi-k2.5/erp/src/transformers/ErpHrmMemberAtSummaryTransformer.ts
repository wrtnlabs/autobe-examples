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
        first_name: true,
        last_name: true,
        avatar_url: true,
        created_at: true,
      },
    } satisfies Prisma.erp_hrm_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmMember.ISummary> {
    return {
      id: input.id,
      email: input.email,
      firstName: input.first_name,
      lastName: input.last_name,
      avatarUrl: input.avatar_url ?? null,
      createdAt: input.created_at.toISOString(),
    };
  }
}
