import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditLikeMemberPasswordResetAtSummaryTransformer {
  export type Payload = Prisma.reddit_like_member_password_resetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        token: true,
        created_at: true,
        expires_at: true,
        used_at: true,
        ip_address: true,
        user_agent: true,
        member: true,
      },
    } satisfies Prisma.reddit_like_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditLikeMemberPasswordReset.ISummary> {
    const now = new Date();
    const status: "pending" | "used" | "expired" = input.used_at
      ? "used"
      : input.expires_at < now
        ? "expired"
        : "pending";
    return {
      id: input.id,
      status,
      createdAt: input.created_at.toISOString(),
      expiresAt: input.expires_at.toISOString(),
      usedAt: input.used_at?.toISOString() ?? null,
      ipAddress: input.ip_address,
      userAgent: input.user_agent ?? null,
    };
  }
}
