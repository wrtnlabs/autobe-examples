import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function patchDiscussionBoardMemberArticlesArticleIdTags(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleTag.IRequest;
}): Promise<IPageIDiscussionBoardArticleTag.ISummary> {
  const { member, articleId, body } = props;

  // 1) Verify article existence and ownership
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId },
    select: { id: true, discussion_board_member_id: true, updated_at: true },
  });
  if (!article) throw new HttpException("Not Found", 404);

  if (article.discussion_board_member_id !== member.id) {
    throw new HttpException(
      "Unauthorized: Only the article author may modify tags",
      403,
    );
  }

  // 2) Optimistic concurrency (if provided)
  if (body.if_match_version !== undefined && body.if_match_version !== null) {
    const currentVersion = article.updated_at
      ? toISOStringSafe(article.updated_at)
      : null;
    if (currentVersion !== body.if_match_version) {
      throw new HttpException("Precondition Failed: version mismatch", 412);
    }
  }

  // 3) Build final slug list depending on request shape
  let targetSlugs: string[];

  if ((body as { tag_slugs?: unknown }).tag_slugs !== undefined) {
    // Replacement mode
    targetSlugs = (body as { tag_slugs: string[] }).tag_slugs ?? [];
  } else {
    // Action mode - compute from current assignments
    const add = (body as { add?: string[] }).add ?? [];
    const remove = (body as { remove?: string[] }).remove ?? [];

    const currentAssignments =
      await MyGlobal.prisma.discussion_board_article_tags.findMany({
        where: { discussion_board_article_id: articleId },
        include: { tag: true },
      });

    const set = new Set<string>(currentAssignments.map((c) => c.tag.slug));
    for (const s of add) set.add(s);
    for (const s of remove) set.delete(s);
    targetSlugs = Array.from(set);
  }

  // 4) Enforce tag limit
  const MAX_TAGS = 10;
  if (targetSlugs.length > MAX_TAGS) {
    throw new HttpException(
      `Tag limit exceeded: maximum ${MAX_TAGS} allowed`,
      400,
    );
  }

  // 5) Resolve slugs to tags (skip DB query if no slugs requested)
  const tagsFound =
    targetSlugs.length > 0
      ? await MyGlobal.prisma.discussion_board_tags.findMany({
          where: {
            slug: { in: targetSlugs },
            is_active: true,
            deleted_at: null,
          },
        })
      : [];

  const foundSlugs = new Set(tagsFound.map((t) => t.slug));
  const missing = targetSlugs.filter((s) => !foundSlugs.has(s));
  if (missing.length > 0) {
    throw new HttpException(`Invalid tag slugs: ${missing.join(", ")}`, 400);
  }

  // 6) Compute diffs against current assignments
  const current = await MyGlobal.prisma.discussion_board_article_tags.findMany({
    where: { discussion_board_article_id: articleId },
  });

  const currentTagIds = new Set(current.map((c) => c.discussion_board_tag_id));
  const targetTagIds = new Set(tagsFound.map((t) => t.id));

  const toCreateIds = Array.from(targetTagIds).filter(
    (id) => !currentTagIds.has(id),
  );
  const toRemoveIds = Array.from(currentTagIds).filter(
    (id) => !targetTagIds.has(id),
  );

  // 7) Apply changes atomically
  try {
    const ops: Array<Prisma.PrismaPromise<unknown>> = [];

    if (toRemoveIds.length > 0) {
      ops.push(
        MyGlobal.prisma.discussion_board_article_tags.deleteMany({
          where: {
            discussion_board_article_id: articleId,
            discussion_board_tag_id: { in: toRemoveIds },
          },
        }),
      );
    }

    for (const tagId of toCreateIds) {
      ops.push(
        MyGlobal.prisma.discussion_board_article_tags.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            discussion_board_article_id: articleId,
            discussion_board_tag_id: tagId,
            created_at: toISOStringSafe(new Date()),
            created_by_member_id: member.id,
          },
        }),
      );
    }

    if (ops.length > 0) await MyGlobal.prisma.$transaction(ops);
  } catch (err: unknown) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err as any).code === "P2002"
    ) {
      throw new HttpException("Conflict: concurrent modification", 409);
    }
    throw err;
  }

  // 8) Read back assignments and map to DTO
  const updatedAssignments =
    await MyGlobal.prisma.discussion_board_article_tags.findMany({
      where: { discussion_board_article_id: articleId },
      orderBy: { created_at: "asc" },
      include: { tag: true },
    });

  const data = await Promise.all(
    updatedAssignments.map(async (a) => {
      let createdBy: IDiscussionBoardMember.ISummary | null | undefined = null;
      if (a.created_by_member_id) {
        const m = await MyGlobal.prisma.discussion_board_member.findUnique({
          where: { id: a.created_by_member_id },
          select: {
            id: true,
            username: true,
            display_name: true,
            created_at: true,
          },
        });
        createdBy = m
          ? {
              id: m.id,
              username: m.username,
              display_name: m.display_name ?? null,
              created_at: toISOStringSafe(m.created_at),
            }
          : null;
      }

      return {
        id: a.id,
        tag: {
          id: a.tag.id,
          name: a.tag.name,
          slug: a.tag.slug,
          description: a.tag.description ?? null,
          is_active: a.tag.is_active,
          created_at: toISOStringSafe(a.tag.created_at),
          updated_at: a.tag.updated_at
            ? toISOStringSafe(a.tag.updated_at)
            : null,
          deleted_at: a.tag.deleted_at
            ? toISOStringSafe(a.tag.deleted_at)
            : null,
        },
        created_by: createdBy,
        created_at: toISOStringSafe(a.created_at),
      } satisfies IDiscussionBoardArticleTag.ISummary;
    }),
  );

  const total = data.length;
  return {
    pagination: {
      current: Number(1),
      limit: Number(total),
      records: Number(total),
      pages: Number(total === 0 ? 0 : 1),
    },
    data,
  } satisfies IPageIDiscussionBoardArticleTag.ISummary;
}
