import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeOwnerAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_ownersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        username: true,
        display_name: true,
        email: true,
        is_active: true,
      },
    } satisfies Prisma.reddit_like_ownersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeOwner.ISummary> {
    return {
      id: input.id,
      username: input.username,
      displayName: input.display_name,
      email: input.email,
      isActive: input.is_active,
    };
  }
}
