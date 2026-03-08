import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicPoliticalBoardAdminSectionsSectionId(props: {
  admin: AdminPayload;
  sectionId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.economic_political_board_sections.findUniqueOrThrow({
    where: { id: props.sectionId },
  });
  await MyGlobal.prisma.economic_political_board_sections.delete({
    where: { id: props.sectionId },
  });
}
