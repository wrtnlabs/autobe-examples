import { IDiscussionBoardStatusEnumReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnumReference";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumReferenceTransformer } from "../transformers/DiscussionBoardStatusEnumReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumReference.IUpdate;
}): Promise<IDiscussionBoardStatusEnumReference> {
  // Verify the status enum exists
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: { id: props.statusEnumId },
  });
  // Get the current reference to check ownership/validation using the foreign key field
  const current =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUniqueOrThrow(
      {
        where: { id: props.referenceId },
        select: {
          discussion_board_status_enums_id: true,
        } satisfies Prisma.discussion_board_status_enum_referencesFindUniqueArgs,
      },
    );
  // Ensure the reference belongs to the specified status enum
  if (current.discussion_board_status_enums_id !== props.statusEnumId) {
    throw new HttpException(
      "Reference does not belong to the specified status enum",
      400,
    );
  }
  // Build update data object with undefined-safe updates
  const updateData: Prisma.discussion_board_status_enum_referencesUpdateInput =
    {
      updated_at: new Date(),
    };
  if (props.body.referenced_table !== undefined) {
    updateData.referenced_table = props.body.referenced_table;
  }
  if (props.body.referenced_column !== undefined) {
    updateData.referenced_column = props.body.referenced_column;
  }
  // Perform the update
  await MyGlobal.prisma.discussion_board_status_enum_references.update({
    where: { id: props.referenceId },
    data: updateData,
  });
  // Fetch the updated record using the transformer select
  const updated =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUniqueOrThrow(
      {
        where: { id: props.referenceId },
        ...DiscussionBoardStatusEnumReferenceTransformer.select(),
      },
    );
  // Transform to response DTO using the transformer
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(updated);
}
