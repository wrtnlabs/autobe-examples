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

export async function postDiscussionBoardSuperAdminSections(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSection.ICreate;
}): Promise<IDiscussionBoardSection> {
  try {
    const now = new Date();
    const nowISOString = now.toISOString() as string & tags.Format<"date-time">;
    const section = await MyGlobal.prisma.discussion_board_sections.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        name: props.body.name,
        description: props.body.description,
        created_at: nowISOString,
        updated_at: nowISOString,
        deleted_at: null,
      },
      ...DiscussionBoardSectionTransformer.select(),
    });
    return await DiscussionBoardSectionTransformer.transform(section);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Section name already exists", 409);
    }
    throw error;
  }
}
