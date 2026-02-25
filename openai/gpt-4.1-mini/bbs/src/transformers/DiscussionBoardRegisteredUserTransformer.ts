import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";
import { DiscussionBoardCommentAtSummaryTransformer } from "./DiscussionBoardCommentAtSummaryTransformer";

export namespace DiscussionBoardRegisteredUserTransformer {
  export type Payload = Prisma.discussion_board_registered_usersGetPayload<
    ReturnType<typeof select>
  >;
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardRegisteredUser> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name,
      bio: input.bio ?? undefined,
      isBanned: input.is_banned,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      articles: await ArrayUtil.asyncMap(
        input.articles,
        DiscussionBoardArticleAtSummaryTransformer.transform,
      ),
      comments: await ArrayUtil.asyncMap(
        input.comments,
        DiscussionBoardCommentAtSummaryTransformer.transform,
      ),
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        bio: true,
        is_banned: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: true,
        passwordResets: true,
        emailVerifications: true,
        auditLogs: true,
        articles: DiscussionBoardArticleAtSummaryTransformer.select(),
        comments: DiscussionBoardCommentAtSummaryTransformer.select(),
        administratorRequests: true,
        userBans: true,
      },
    } satisfies Prisma.discussion_board_registered_usersFindManyArgs;
  }
}
