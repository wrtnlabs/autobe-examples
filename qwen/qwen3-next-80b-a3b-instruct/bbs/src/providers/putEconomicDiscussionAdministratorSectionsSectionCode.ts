import { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
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

export async function putEconomicDiscussionAdministratorSectionsSectionCode(props: {
  administrator: AdministratorPayload;
  sectionCode: string;
  body: IEconomicDiscussionSection.IUpdate;
}): Promise<IEconomicDiscussionSection> {
  const { sectionCode } = props;
  const section = await MyGlobal.prisma.economic_discussion_sections.findUnique(
    {
      where: { id: sectionCode },
    },
  );
  if (!section) {
    throw new HttpException("Section not found", 404);
  }
  // Return only the id field as defined in the IEconomicDiscussionSection interface
  // The schema shows no other fields exist in economic_discussion_sections table
  return {
    id: section.id,
  };
}
