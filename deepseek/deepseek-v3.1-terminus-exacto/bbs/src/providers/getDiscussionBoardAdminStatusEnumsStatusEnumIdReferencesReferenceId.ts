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

export async function getDiscussionBoardAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusEnumReference> {
  // Query the reference record with the specified ID
  const reference =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUniqueOrThrow(
      {
        where: {
          id: props.referenceId,
          deleted_at: null, // Only active records
        },
        ...DiscussionBoardStatusEnumReferenceTransformer.select(),
      },
    );
  // Validate that the reference belongs to the specified statusEnumId
  if (reference.statusEnum.id !== props.statusEnumId) {
    throw new HttpException(
      "Reference does not belong to the specified status enumeration",
      400,
    );
  }
  // Transform and return the result
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(
    reference,
  );
}
