import { ICommunityKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityKarma";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityKarmaTransformer {
  export type Payload = Prisma.community_karmasGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        score: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        user: true,
      },
    } satisfies Prisma.community_karmasFindManyArgs;
  }
  export async function transform(input: Payload): Promise<ICommunityKarma> {
    return {
      id: input.id,
      score: Number(input.score),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
    };
  }
}
