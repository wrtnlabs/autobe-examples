import { IEconomicDiscussionSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EconomicDiscussionSectionCollector } from "../collectors/EconomicDiscussionSectionCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EconomicDiscussionSectionTransformer } from "../transformers/EconomicDiscussionSectionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEconomicDiscussionAdministratorSections(props: {
  administrator: AdministratorPayload;
  body: IEconomicDiscussionSection.ICreate;
}): Promise<IEconomicDiscussionSection> {
  // No validation for name or description - these properties don't exist in ICreate DTO
  // Per collector implementation, name and description are set to empty strings by default
  // No need to check for existing section by name - name field is empty and non-functional
  // The collector already handles all data transformation
  const created = await MyGlobal.prisma.economic_discussion_sections.create({
    data: await EconomicDiscussionSectionCollector.collect({
      body: props.body,
      economicDiscussionAdministrators: { id: props.administrator.id },
      economicDiscussionAdministratorSessions: {
        id: props.administrator.session_id,
      },
    }),
    ...EconomicDiscussionSectionTransformer.select(),
  });
  // Transformer returns only id - no other fields are available
  return await EconomicDiscussionSectionTransformer.transform(created);
}
