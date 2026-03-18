import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

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
        display_name: true,
        avatar_uri: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        _count: {
          select: {
            organizationMembers: true,
          },
        },
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
      organization_membership_count: input._count.organizationMembers,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
