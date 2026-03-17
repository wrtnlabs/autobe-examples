import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformMemberAtSummaryTransformer {
  export type Payload = Prisma.community_platform_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        code: true,
        email: true,
        email_verified: true,
        status: true,
        last_signed_in_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_platform_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformMember.ISummary> {
    return {
      id: input.id,
      code: input.code,
      email: input.email,
      email_verified: input.email_verified,
      status: input.status,
      last_signed_in_at: input.last_signed_in_at?.toISOString() ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
