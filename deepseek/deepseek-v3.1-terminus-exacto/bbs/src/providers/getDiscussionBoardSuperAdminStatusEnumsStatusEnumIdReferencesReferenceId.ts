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

export async function getDiscussionBoardSuperAdminStatusEnumsStatusEnumIdReferencesReferenceId(props: {
  superAdmin: SuperadminPayload;
  statusEnumId: string & tags.Format<"uuid">;
  referenceId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardStatusEnumReference> {
  const reference =
    await MyGlobal.prisma.discussion_board_status_enum_references.findUniqueOrThrow(
      {
        where: {
          id: props.referenceId,
          discussion_board_status_enums_id: props.statusEnumId,
          deleted_at: null,
        },
        ...DiscussionBoardStatusEnumReferenceTransformer.select(),
      },
    );
  return await DiscussionBoardStatusEnumReferenceTransformer.transform(
    reference,
  );
}
