import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberPasswordReset";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { RedditCloneMemberAtSummaryTransformer } from "./RedditCloneMemberAtSummaryTransformer";

export namespace RedditCloneMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.reddit_clone_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expired_at: true,
        used_at: true,
        member: RedditCloneMemberAtSummaryTransformer.select(),
      },
    } satisfies Prisma.reddit_clone_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditCloneMemberPasswordReset.ISummary> {
    return {
      id: input.id,
      member: await RedditCloneMemberAtSummaryTransformer.transform(
        input.member,
      ),
      created_at: input.created_at.toISOString(),
      expired_at: input.expired_at.toISOString(),
      used_at: input.used_at?.toISOString() ?? null,
    };
  }
}
