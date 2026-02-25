import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IUser";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace UserAtSummaryTransformer {
  export type Payload = Prisma.economic_board_citizensGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        is_banned: true,
        ban_reason: true,
        created_at: true,
        updated_at: true,
        citizenSessions: { select: { id: true } },
        passwordResets: { select: { id: true } },
        emailVerifications: { select: { id: true } },
        auditTargets: { select: { id: true } },
        articles: { select: { id: true } },
        comments: { select: { id: true } },
        articleViews: { select: { id: true } },
      },
    } satisfies Prisma.economic_board_citizensFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IUser.ISummary> {
    return {
      id: input.id,
      display_name: input.display_name ?? undefined,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      article_count: input.articles.length,
      comment_count: input.comments.length,
    };
  }
}
