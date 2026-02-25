import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityMemberTransformer {
  export type Payload = Prisma.community_membersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        email: true,
        display_name: true,
        bio: true,
        avatar_url: true,
        karma: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.community_membersFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityMember> {
    return {
      id: input.id,
      username: input.username,
      email: input.email ?? undefined,
      display_name: input.display_name ?? null,
      bio: input.bio ?? null,
      avatar_url: input.avatar_url ?? null,
      karma: input.karma,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
    };
  }
}
