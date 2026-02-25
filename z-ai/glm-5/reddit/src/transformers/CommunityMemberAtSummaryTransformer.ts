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
        username: true,
        display_name: true,
        avatar_url: true,
        karma: true,
        created_at: true,
      },
    } satisfies Prisma.community_membersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityMember.ISummary> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.display_name ?? null,
      avatarUrl: input.avatar_url ?? null,
      karma: input.karma,
      createdAt: input.created_at.toISOString(),
    };
  }
}
