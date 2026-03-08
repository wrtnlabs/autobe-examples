import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSectionTransformer } from "../transformers/DiscussionBoardSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardSuperAdminSectionsSectionId(props: {
  superAdmin: SuperadminPayload;
  sectionId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSection.IUpdate;
}): Promise<IDiscussionBoardSection> {
  // Ensure name uniqueness if provided
  if (props.body.name !== undefined) {
    const existingByName =
      await MyGlobal.prisma.discussion_board_sections.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.sectionId },
          deleted_at: null,
        },
      });
    if (existingByName !== null) {
      throw new HttpException("Section name already exists", 409);
    }
  }
  const updated = await MyGlobal.prisma.discussion_board_sections.update({
    where: { id: props.sectionId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
    },
    ...DiscussionBoardSectionTransformer.select(),
  });
  return await DiscussionBoardSectionTransformer.transform(updated);
}
