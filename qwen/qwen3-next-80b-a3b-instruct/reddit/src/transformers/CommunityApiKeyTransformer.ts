import { ICommunityApiKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityApiKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityApiKeyTransformer {
  export type Payload = Prisma.community_api_keysGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        key: true,
        description: true,
        status: true,
        created_at: true,
        updated_at: true,
        expired_at: true,
        actor: true,
        creator: true,
      },
    } satisfies Prisma.community_api_keysFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityApiKey> {
    return {
      id: input.id,
      key: input.key,
      description: input.description ?? undefined,
      status: typia.assert<"active" | "revoked" | "expired">(input.status),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      expired_at: toISOStringSafe(input.expired_at),
      actor_id: input.actor.id,
      creator_id: input.creator.id,
    };
  }
}
