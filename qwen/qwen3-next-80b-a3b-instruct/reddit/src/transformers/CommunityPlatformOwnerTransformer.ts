import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOwner";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace CommunityPlatformOwnerTransformer {
  export type Payload = Prisma.community_platform_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
      },
    } satisfies Prisma.community_platform_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<ICommunityPlatformOwner> {
    return {
      id: input.id,
    };
  }
}
