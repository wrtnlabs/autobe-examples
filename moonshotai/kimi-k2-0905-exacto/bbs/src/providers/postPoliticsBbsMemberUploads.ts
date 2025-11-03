import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticsBbsUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticsBbsUpload";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postPoliticsBbsMemberUploads(props: {
  member: MemberPayload;
  body: IPoliticsBbsUpload.ICreate;
}): Promise<IPoliticsBbsUpload> {
  const fileData = Buffer.from(props.body.file.data, "base64");

  await MyGlobal.prisma.politics_bbs_member_sessions.update({
    where: { id: props.member.session_id },
    data: {
      ip: props.body.ip ?? undefined,
      href: props.body.href ?? undefined,
      referrer: props.body.referrer ?? undefined,
    },
  });

  // Set article_id to a placeholder UUID for file attachments
  // Files are uploaded independently of articles initially
  const placeholderArticleId = v4() as string & tags.Format<"uuid">;

  const created = await MyGlobal.prisma.politics_bbs_file_attachments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_member_id: props.member.id as string & tags.Format<"uuid">,
      politics_bbs_article_id: placeholderArticleId,
      filename: props.body.file.filename,
      file_size: fileData.length,
      mime_type: props.body.file.mime_type,
      file_path: `https://storage.example.com/uploads/${v4()}`,
      created_at: toISOStringSafe(new Date()),
    },
  });

  await MyGlobal.prisma.politics_bbs_attachment_of_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      politics_bbs_attachment_id: created.id,
      politics_bbs_member_id: props.member.id as string & tags.Format<"uuid">,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: created.id,
    politics_bbs_article_id: created.politics_bbs_article_id ?? null,
    politics_bbs_member_id: created.politics_bbs_member_id ?? null,
    filename: created.filename,
    file_size: created.file_size,
    mime_type: created.mime_type as IPoliticsBbsUpload["mime_type"],
    file_path: created.file_path,
    created_at: toISOStringSafe(created.created_at),
  } satisfies IPoliticsBbsUpload;
}
