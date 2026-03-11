import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardArticleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleViewStat";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { DiscussionBoardArticleAtSummaryTransformer } from "./DiscussionBoardArticleAtSummaryTransformer";

export namespace DiscussionBoardArticleViewStatAtSummaryTransformer {
  export type Payload = Prisma.discussion_board_article_view_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        viewed_at: true,
        ip_address_hash: true,
        user_agent_hash: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        article: DiscussionBoardArticleAtSummaryTransformer.select(),
        member: {
          select: { id: true },
        } satisfies Prisma.discussion_board_membersFindManyArgs,
        admin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_adminsFindManyArgs,
        superAdmin: {
          select: { id: true },
        } satisfies Prisma.discussion_board_super_adminsFindManyArgs,
        guest: {
          select: { id: true },
        } satisfies Prisma.discussion_board_guestsFindManyArgs,
        memberSession: {
          select: { id: true },
        } satisfies Prisma.discussion_board_member_sessionsFindManyArgs,
        adminSession: {
          select: { id: true },
        } satisfies Prisma.discussion_board_admin_sessionsFindManyArgs,
        superAdminSession: {
          select: { id: true },
        } satisfies Prisma.discussion_board_super_admin_sessionsFindManyArgs,
        guestSession: {
          select: { id: true },
        } satisfies Prisma.discussion_board_guest_sessionsFindManyArgs,
      },
    } satisfies Prisma.discussion_board_article_view_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardArticleViewStat.ISummary> {
    return {
      id: input.id,
      viewed_at: input.viewed_at.toISOString(),
      member_id: input.member?.id ?? null,
      admin_id: input.admin?.id ?? null,
      super_admin_id: input.superAdmin?.id ?? null,
      guest_id: input.guest?.id ?? null,
      article: await DiscussionBoardArticleAtSummaryTransformer.transform(
        input.article,
      ),
    };
  }
}
