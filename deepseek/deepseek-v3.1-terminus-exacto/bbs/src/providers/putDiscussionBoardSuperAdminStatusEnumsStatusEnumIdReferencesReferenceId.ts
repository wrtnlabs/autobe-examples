import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardStatusEnumReferenceTransformer } from "../transformers/DiscussionBoardStatusEnumReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardSuperAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumReference.IUpdate;
}): Promise<IDiscussionBoardStatusEnumReference> {
  // Verify the status enum exists
  const statusEnum =
    await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
      where: { id: props.statusEnumId, deleted_at: null },
    });
  // Verify the reference exists and belongs to the status enum
  const existingReference =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUniqueOrThrow(
      {
        where: {
          id: props.referenceId,
          discussion_board_status_enums_id: props.statusEnumId,
          deleted_at: null,
        },
      },
    );
  // Update the reference with provided data
  const updatedReference =
    await MyGlobal.prisma.discussion_board_status_enum_references.update({
      where: { id: props.referenceId },
      data: {
        ...(props.body.referenced_table !== undefined && {
          referenced_table: props.body.referenced_table,
        }),
        ...(props.body.referenced_column !== undefined && {
          referenced_column: props.body.referenced_column,
        }),
        updated_at: new Date(),
      },
      ...DiscussionBoardStatusEnumReferenceTransformer.select(),
    });
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(
    updatedReference,
  );
}
