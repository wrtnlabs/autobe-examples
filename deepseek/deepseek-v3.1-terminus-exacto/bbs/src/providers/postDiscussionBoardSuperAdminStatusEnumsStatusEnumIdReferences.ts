import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardStatusEnumReferenceCollector } from "../collectors/DiscussionBoardStatusEnumReferenceCollector";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumReferenceTransformer } from "../transformers/DiscussionBoardStatusEnumReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminStatusEnumsStatusEnumIdReferences(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumReference.ICreate;
}): Promise<IDiscussionBoardStatusEnumReference> {
  // Validate that the statusEnumId exists
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUnique({
      where: { id: props.statusEnumId },
    });
  if (!statusEnum) {
    throw new HttpException("Status enumeration value not found", 404);
  }
  // Check if the referenced table and column combination already exists for this status enum
  const existingReference =
    await MyGlobal.prisma.discussion_board_status_enum_references.findFirst({
      where: {
        discussion_board_status_enums_id: props.statusEnumId,
        referenced_table: props.body.referenced_table,
        referenced_column: props.body.referenced_column,
        deleted_at: null,
      },
    });
  if (existingReference) {
    throw new HttpException("Reference relationship already exists", 409);
  }
  // Create the new reference relationship record
  const created =
    await MyGlobal.prisma.discussion_board_status_enum_references.create({
      data: await DiscussionBoardStatusEnumReferenceCollector.collect({
        body: props.body,
        statusEnum: { id: props.statusEnumId },
      }),
      ...DiscussionBoardStatusEnumReferenceTransformer.select(),
    });
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(created);
}
