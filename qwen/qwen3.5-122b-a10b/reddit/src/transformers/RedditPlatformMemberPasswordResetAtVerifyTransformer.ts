import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformMemberPasswordResetAtVerifyTransformer {
  export type Payload = Prisma.reddit_platform_member_password_resetsGetPayload<
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
        member: {
          select: {
            email: true,
          },
        } satisfies Prisma.reddit_platform_membersFindManyArgs,
      },
    } satisfies Prisma.reddit_platform_member_password_resetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformMemberPasswordReset.IVerify> {
    const now = new Date();
    const isUsed = input.deleted_at !== null;
    const isExpired = input.expires_at < now;
    let status: "valid" | "expired" | "used";
    if (isUsed) {
      status = "used";
    } else if (isExpired) {
      status = "expired";
    } else {
      status = "valid";
    }
    return {
      id: input.id,
      status: status,
      email: input.member.email,
      expires_at: input.expires_at.toISOString(),
      created_at: input.created_at.toISOString(),
    };
  }
}
