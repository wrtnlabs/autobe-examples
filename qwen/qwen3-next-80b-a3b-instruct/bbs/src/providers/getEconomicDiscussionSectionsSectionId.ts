import { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicDiscussionSectionsSectionId(props: {
  sectionId: string;
}): Promise<IEconomicDiscussionSection> {
  const section = await MyGlobal.prisma.economic_discussion_sections.findUnique(
    {
      where: { id: props.sectionId },
    },
  );
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  return {
    id: section.id,
  };
}
