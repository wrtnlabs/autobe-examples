import { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityAdminTransformer {
  export type Payload = Prisma.community_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        display_name: true,
        bio: true,
        avatar_url: true,
      },
    } satisfies Prisma.community_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityAdmin> {
    return {
      id: input.id,
      email: input.email,
      username: input.username,
      display_name: input.display_name,
      bio: input.bio,
      avatar_url: input.avatar_url,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
