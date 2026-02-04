import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteEconomicDiscussionAdministratorSectionsSectionId(props: {
  administrator: AdministratorPayload;
  sectionId: string;
}): Promise<void> {
  // Verify section exists
  const section =
    await MyGlobal.prisma.economic_discussion_sections.findUniqueOrThrow({
      where: { id: props.sectionId },
    });
  // Perform hard delete
  await MyGlobal.prisma.economic_discussion_sections.delete({
    where: { id: props.sectionId },
  });
}
