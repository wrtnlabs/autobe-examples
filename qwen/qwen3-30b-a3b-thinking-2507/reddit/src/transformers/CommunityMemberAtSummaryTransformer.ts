import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityMemberAtSummaryTransformer {
  export type Payload = Prisma.community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        display_name: true,
        avatar_url: true,
        created_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMember.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name ?? undefined,
      avatar_url: input.avatar_url ?? undefined,
      created_at: toISOStringSafe(input.created_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
