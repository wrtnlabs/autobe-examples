import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberPasswordResetTransformer {
  export type Payload = Prisma.reddit_like_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        redditLikeMember: {
          select: {
            id: true,
          },
        } satisfies Prisma.reddit_like_membersFindManyArgs,
      },
    } satisfies Prisma.reddit_like_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberPasswordReset> {
    return {
      id: input.id,
      reddit_like_member_id: input.redditLikeMember.id,
      expires_at: toISOStringSafe(input.expires_at),
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      valid: input.deleted_at === null && input.expires_at > new Date(),
    } satisfies IRedditLikeMemberPasswordReset;
  }
}
