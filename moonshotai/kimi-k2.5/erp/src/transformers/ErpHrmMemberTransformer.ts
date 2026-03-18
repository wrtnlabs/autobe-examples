import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmMemberTransformer {
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
        timezone: true,
        locale: true,
        email_verified_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmMember> {
    return {
      id: input.id,
      email: input.email,
      firstName: input.first_name,
      lastName: input.last_name,
      avatarUrl: input.avatar_url,
      timezone: input.timezone,
      locale: input.locale,
      emailVerifiedAt: input.email_verified_at?.toISOString() ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
