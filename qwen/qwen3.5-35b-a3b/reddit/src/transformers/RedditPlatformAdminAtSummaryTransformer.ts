import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace RedditPlatformAdminAtSummaryTransformer {
  export type Payload = Prisma.reddit_platform_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        is_active: true,
        created_at: true,
        password_hash: true,
        bio: true,
        avatar_url: true,
        updated_at: true,
        sessions: true,
        passwordResets: true,
        auditLogs: true,
        reportViews: true,
      },
    } satisfies Prisma.reddit_platform_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IRedditPlatformAdmin.ISummary> {
    return {
      id: input.id,
      username: input.username,
      display_name: input.display_name,
      email: input.email,
      is_active: input.is_active,
      created_at: input.created_at.toISOString(),
    };
  }
}
