import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberPasswordReset.ISummary> {
    const now = new Date();
    const isExpired = input.expires_at < now;
    const isUsed = input.used_at !== null;
    let status: "pending" | "used" | "expired";
    if (isUsed) {
      status = "used";
    } else if (isExpired) {
      status = "expired";
    } else {
      status = "pending";
    }
    return {
      id: input.id,
      status,
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expires_at.toISOString(),
      usedAt: input.used_at?.toISOString() ?? null,
      ipAddress: input.ip_address,
      userAgent: input.user_agent,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        created_at: true,
        expires_at: true,
        used_at: true,
        ip_address: true,
        user_agent: true,
      },
    } satisfies Prisma.reddit_like_member_password_resetsFindManyArgs;
  }
}
