import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticle";
import { IPoliticsBbsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsCategory";
import { IPoliticsBbsArticleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsArticleSnapshot";
import { IPoliticsBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsComment";
import { IPoliticsBbsFileAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsFileAttachment";
import { IPoliticsBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsMember";
import { IPoliticsBbsImageAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsImageAttachment";
import { IPoliticsBbsAttachmentOfVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfVisitor";
import { IPoliticsBbsVisitor } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsVisitor";
import { IPoliticsBbsAttachmentOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfMember";
import { IPoliticsBbsAttachmentOfModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsAttachmentOfModerator";
import { IPoliticsBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsModerator";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postPoliticsBbsMemberArticles(props: {
  member: MemberPayload;
  body: IPoliticsBbsArticle.ICreate;
}): Promise<IPoliticsBbsArticle> {
  const { member, body } = props;

  const created = await MyGlobal.prisma.politics_bbs_articles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_category_id: body.politics_bbs_category_id,
      politics_bbs_creator_id: member.id,
      title: body.title,
      content: body.content,
      state: "pending",
      view_count: 0,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
    include: {
      category: true,
    },
  });

  const snapshot = await MyGlobal.prisma.politics_bbs_article_snapshots.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_article_id: created.id,
      title: created.title,
      content: created.content,
      state: created.state,
      view_count: created.view_count,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    politics_bbs_category_id: created.politics_bbs_category_id,
    politics_bbs_creator_id: created.politics_bbs_creator_id,
    title: created.title,
    content: created.content,
    state: created.state,
    view_count: created.view_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    category: created.category
      ? ({
          id: created.category.id,
          name: created.category.name,
          code: created.category.code,
          description: created.category.description,
          color: created.category.color,
          icon: created.category.icon,
          sequence: created.category.sequence,
          primary: created.category.primary,
          required: created.category.required,
          multiplicative: created.category.multiplicative,
          created_at: toISOStringSafe(created.category.created_at),
          updated_at: toISOStringSafe(created.category.updated_at),
          deleted_at: created.category.deleted_at
            ? toISOStringSafe(created.category.deleted_at)
            : null,
        } satisfies IPoliticsBbsCategory)
      : undefined,
    snapshots: [
      {
        id: snapshot.id,
        politics_bbs_article_id: snapshot.politics_bbs_article_id,
        title: snapshot.title,
        content: snapshot.content,
        state: snapshot.state,
        view_count: snapshot.view_count,
        created_at: toISOStringSafe(snapshot.created_at),
      },
    ],
    comments: [],
    file_attachments: [],
  } satisfies IPoliticsBbsArticle;
}
