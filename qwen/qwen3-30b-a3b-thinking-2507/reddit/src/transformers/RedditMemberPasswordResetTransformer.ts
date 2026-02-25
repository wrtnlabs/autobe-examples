import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import { IRedditMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditMemberAtSummaryTransformer } from "./RedditMemberAtSummaryTransformer";

export namespace RedditMemberPasswordResetTransformer {
  export type Payload = Prisma.reddit_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        expires_at: true,
        used_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        member: RedditMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditMemberPasswordReset> {
    return {
      id: input.id,
      token: input.token,
      expires_at: toISOStringSafe(input.expires_at),
      used_at: input.used_at ? toISOStringSafe(input.used_at) : null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      member: await RedditMemberAtSummaryTransformer.transform(input.member),
    };
  }
}
