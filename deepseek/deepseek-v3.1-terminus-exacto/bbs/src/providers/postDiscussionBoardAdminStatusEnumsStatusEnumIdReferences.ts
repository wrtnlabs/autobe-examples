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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardStatusEnumReferenceTransformer } from "../transformers/DiscussionBoardStatusEnumReferenceTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminStatusEnumsStatusEnumIdReferences(props: {
  admin: AdminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  body: IDiscussionBoardStatusEnumReference.ICreate;
}): Promise<IDiscussionBoardStatusEnumReference> {
  // Validate the status enum exists
  await MyGlobal.prisma.discussion_board_status_enums.findUniqueOrThrow({
    where: { id: props.statusEnumId },
  });
  // Check for duplicate reference combination
  const existing =
    await MyGlobal.prisma.discussion_board_status_enum_references.findFirst({
      where: {
        discussion_board_status_enums_id: props.statusEnumId,
        referenced_table: props.body.referenced_table,
        referenced_column: props.body.referenced_column,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException(
      `Reference relationship already exists for table '${props.body.referenced_table}' column '${props.body.referenced_column}'`,
      400,
    );
  }
  // Create the reference record using collector
  const created =
    await MyGlobal.prisma.discussion_board_status_enum_references.create({
      data: await DiscussionBoardStatusEnumReferenceCollector.collect({
        body: props.body,
        statusEnum: { id: props.statusEnumId } satisfies IEntity,
      }),
      ...DiscussionBoardStatusEnumReferenceTransformer.select(),
    });
  // Transform and return response
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(created);
}
