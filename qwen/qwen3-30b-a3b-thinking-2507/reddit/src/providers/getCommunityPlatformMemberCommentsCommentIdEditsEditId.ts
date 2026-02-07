import { ICommunityPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentEdit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommentEditTransformer } from "../transformers/CommunityPlatformCommentEditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommentsCommentIdEditsEditId(props: {
  member: MemberPayload;
  commentId: string & tags.Format<"uuid">;
  editId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommentEdit> {
  const edit =
    await MyGlobal.prisma.community_platform_comment_edits.findUnique({
      where: {
        id: props.editId,
        community_platform_comment_id: props.commentId,
      },
      ...CommunityPlatformCommentEditTransformer.select(),
    });
  if (!edit) {
    throw new HttpException("Edit not found", 404);
  }
  return await CommunityPlatformCommentEditTransformer.transform(edit);
}
